use rquickjs::{
    class::Trace, function::IntoJsFunc, Class, Context, Ctx, Error, Function, Runtime, Value,
    loader::{
        BuiltinLoader, BuiltinResolver, FileResolver, ModuleLoader, ScriptLoader,
    },
    context::EvalOptions,
};
use tiny_skia::{FillRule, LineCap, Paint, PathBuilder, Pixmap, Rect, Stroke, PremultipliedColorU8, Transform};
use ab_glyph::{FontRef, Font, Glyph, GlyphId, ScaleFont};

#[derive(Trace)]
#[rquickjs::class]
pub struct DrawContext {
    width: u32,
    height: u32,
    #[qjs(skip_trace)]
    surface: Pixmap,
    font: String,
    in_path: bool,
    #[qjs(skip_trace)]
    path: Option<PathBuilder>,
}

#[rquickjs::methods]
impl DrawContext {
    #[qjs(constructor)]
    pub fn new(width: u32, height: u32) -> Self {
        DrawContext {
            width,
            height,
            surface: Pixmap::new(width, height).unwrap(),
            font: "".to_string(),
            in_path: false,
            path: None,
        }
    }

    #[qjs(rename = "measureText")]
    pub fn measure_text(& mut self, txtch: u32, scale: f64, font: i32) -> std::vec::Vec<f64> {
        let bravura_font: FontRef = FontRef::try_from_slice(include_bytes!("../fonts/Bravura.otf")).unwrap();
        let garamond_font: FontRef = FontRef::try_from_slice(include_bytes!("../fonts/EBGaramond-VariableFont_wght.ttf")).unwrap();
        let chosen_font = if font == 0 { &garamond_font } else { &bravura_font };
        let scaled_font = chosen_font.as_scaled(chosen_font.pt_to_px_scale(scale as f32).unwrap());
        let ch = char::from_u32(txtch).unwrap();
        let glyph: GlyphId = chosen_font.glyph_id(ch);
        let h_advance = scaled_font.h_advance(glyph);
        let v_advance = scaled_font.v_advance(glyph);
        return vec![h_advance as f64, v_advance as f64];
    }

    #[qjs(rename = "fillText")]
    pub fn fill_text(& mut self, txtch: u32, x: f64, y: f64, scale: f64, font: i32) {
        // Get font and scale from self.font
        let stride = self.surface.width();
        let width = self.width as i32;
        let height = self.height as i32;
        let bravura_font: FontRef = FontRef::try_from_slice(include_bytes!("../fonts/Bravura.otf")).unwrap();
        let garamond_font: FontRef = FontRef::try_from_slice(include_bytes!("../fonts/EBGaramond-VariableFont_wght.ttf")).unwrap();
        let chosen_font = if font == 0 { &garamond_font } else { &bravura_font };
        let ch = char::from_u32(txtch).unwrap();
        let glyph: Glyph = chosen_font.glyph_id(ch).with_scale(chosen_font.pt_to_px_scale(scale as f32).unwrap());
        let pixels = self.surface.pixels_mut();
        if let Some(g) = chosen_font.outline_glyph(glyph) {
            g.draw(|xx, yy, c| {
                let xi = xx as i32 + x as i32;
                let yi = yy as i32 + y as i32;
                if xi >= 0 && xi < width && yi >= 0 && yi < height {
                    let offset: usize = (yi as u32 * stride + xi as u32).try_into().unwrap();
                    let i: u8 = (c * 255.0) as u8;
                    pixels[offset] = PremultipliedColorU8::from_rgba(0, 0, 0, i).unwrap();    
                }
            });
        }
    }

    pub fn save(& mut self, filename: String) {
        self.surface.save_png(filename).unwrap();
    }

    #[qjs(rename = "beginPath")]
    pub fn begin_path(& mut self) {
        assert!(!self.in_path);
        self.in_path = true;
        self.path = Some(PathBuilder::new());
    }

    #[qjs(rename = "moveTo")]
    pub fn move_to(& mut self, x: f64, y: f64) {
        assert!(self.in_path);
        assert!(self.path.is_some());
        self.path.as_mut().expect("path must be created").move_to(x as f32, y as f32);
    }

    #[qjs(rename = "lineTo")]
    pub fn line_to(& mut self, x: f64, y: f64) {
        assert!(self.in_path);
        assert!(self.path.is_some());
        self.path.as_mut().expect("path must be created").line_to(x as f32, y as f32);
    }

    pub fn stroke(& mut self, width: f64) {
        assert!(self.in_path);
        assert!(self.path.is_some());
        self.in_path = false;
        // FIXME: I'm cloning the path, then removing it. How do I take ownership and drop it?
        let final_path = self.path.as_mut().expect("path must be created").clone().finish().unwrap();
        self.path = None;
        let mut paint = Paint::default();
        paint.set_color_rgba8(0, 0, 0, 255);
        paint.anti_alias = true;
        let mut stroke = Stroke::default();
        stroke.width = width as f32;
        stroke.line_cap = LineCap::Round;
        self.surface.stroke_path(&final_path, &paint, &stroke, Transform::identity(), None);
    }

    pub fn fill(& mut self) {
        assert!(self.in_path);
        assert!(self.path.is_some());
        self.in_path = false;
        // FIXME: I'm cloning the path, then removing it. How do I take ownership and drop it?
        let final_path = self.path.as_mut().expect("path must be created").clone().finish().unwrap();
        self.path = None;
        let mut paint = Paint::default();
        paint.set_color_rgba8(0, 0, 0, 255);
        paint.anti_alias = true;
        self.surface.fill_path(&final_path, &paint, FillRule::Winding, Transform::identity(), None);
    }

    #[qjs(rename = "fillRect")]
    pub fn fill_rect(& mut self, x: f64, y: f64, width: f64, height: f64) {
        let mut paint = Paint::default();
        paint.set_color_rgba8(0, 0, 0, 255);
        paint.anti_alias = true;
        self.surface.fill_rect(
            Rect::from_xywh(x as f32, y as f32, width as f32, height as f32).unwrap(),
            &paint,
            Transform::identity(),
            None
        );
    }
}

pub fn print(msg: String) {
    println!("{msg}");
}

fn register_function<'js, F, P>(ctx: Ctx<'js>, name: &str, func: F)
where
    F: IntoJsFunc<'js, P> + 'js,
{
    let global = ctx.globals();
    let name_string = String::from(name);
    global
        .set(
            name_string.clone(),
            Function::new(ctx.clone(), func)
                .unwrap()
                .with_name(name_string.clone())
                .unwrap(),
        )
        .unwrap();
}

fn format_exception(v: Value) -> String {
    println!("{}", v.is_error());
    if v.is_error() || v.is_exception() {
        let ex = v.as_exception().unwrap();
        return format!(
            "Uncaught exception: {}\n{}",
            ex.message().unwrap(),
            ex.stack().unwrap()
        );
    }
    if v.is_string() {
        return v.into_string().unwrap().to_string().unwrap();
    }
    return format!("Uncaught exception: {:?}", v);
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let resolver = (
        BuiltinResolver::default(),
        FileResolver::default().with_path("./"),
    );
    let loader = (
        BuiltinLoader::default(),
        ScriptLoader::default(),
    );
    let runtime = Runtime::new().unwrap();
    let ctx = Context::full(&runtime).unwrap();
    runtime.set_loader(resolver, loader);
    ctx.with(|ctx| {
        let global = ctx.globals();
        global.set("arg".to_string(), args[args.len() - 1].clone()).unwrap();
        Class::<DrawContext>::define(&global).unwrap();
        register_function(ctx.clone(), "print", print);
        match ctx.eval_file_with_options::<(), _>("src/test.js", EvalOptions { global: false, strict: true, backtrace_barrier: false }) {
            Err(Error::Exception) => println!("{}", format_exception(ctx.catch())),
            Err(e) => println!("Error! {:?}", e),
            Ok(_) => (),
        }
    });
    while runtime.is_job_pending() {
        match runtime.execute_pending_job() {
            Ok(_) => (),
            Err(e) => println!("Error! {:?}", e),
        }
    }
}
