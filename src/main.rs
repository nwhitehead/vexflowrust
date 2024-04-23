use rquickjs::{
    class::Trace, function::IntoJsFunc, Class, Context, Ctx, Error, Function, Runtime, Value,
};
use tiny_skia::{LineCap, Paint, PathBuilder, Pixmap, Stroke, Transform, PremultipliedColorU8};
use ab_glyph::{FontRef, Font, Glyph};

#[derive(Trace)]
#[rquickjs::class]
pub struct DrawContext {
    width: u32,
    height: u32,
    #[qjs(skip_trace)]
    surface: Pixmap,
    font: String,
    in_path: bool,
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
        }
    }

    #[qjs(rename = "fillText")]
    pub fn fill_text(& mut self, txt: String, x: f64, y: f64) {
        // Get font and scale from self.font
        let stride = self.surface.width();
        let bravura_font: FontRef = FontRef::try_from_slice(include_bytes!("../Bravura.otf")).unwrap();
        let scale = 350.0;
        let glyph: Glyph = bravura_font.glyph_id(txt.chars().nth(0).expect("fillText must be given a character")).with_scale(scale);
        let pixels = self.surface.pixels_mut();
        if let Some(g) = bravura_font.outline_glyph(glyph) {
            g.draw(|xx, yy, c| {
                let offset: usize = ((yy + y as u32) * stride + xx + x as u32).try_into().unwrap();
                let i: u8 = (c * 255.0) as u8;
                pixels[offset] = PremultipliedColorU8::from_rgba(0, 0, 0, i).unwrap();
            });
        }
    }

    #[qjs(rename = "beginPath")]
    pub fn begin_path(& mut self) {
        assert!(!self.in_path);
        self.in_path = true;
    }

    pub fn fill(& mut self) {
        assert!(self.in_path);
        self.in_path = false;
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
    let ex = v.as_exception().unwrap();
    return format!(
        "Uncaught exception: {}\n{}",
        ex.message().unwrap(),
        ex.stack().unwrap()
    );
}

fn main() {
    let bravura_font: FontRef = FontRef::try_from_slice(include_bytes!("../Bravura.otf")).unwrap();

    let runtime = Runtime::new().unwrap();
    let ctx = Context::full(&runtime).unwrap();
    ctx.with(|ctx| {
        let global = ctx.globals();
        Class::<DrawContext>::define(&global).unwrap();
        register_function(ctx.clone(), "print", print);
        match ctx.eval_file::<(), _>("src/test.js") {
            Err(Error::Exception) => println!("{}", format_exception(ctx.catch())),
            Err(e) => println!("Error! {:?}", e),
            Ok(_) => (),
        }
    });

    let mut paint = Paint::default();
    paint.set_color_rgba8(0, 127, 0, 200);
    paint.anti_alias = true;

    let path = {
        let mut pb = PathBuilder::new();
        const RADIUS: f32 = 250.0;
        const CENTER: f32 = 250.0;
        pb.move_to(CENTER + RADIUS, CENTER);
        for i in 1..8 {
            let a = 2.6927937 * i as f32;
            pb.line_to(CENTER + RADIUS * a.cos(), CENTER + RADIUS * a.sin());
        }
        pb.finish().unwrap()
    };

    let mut stroke = Stroke::default();
    stroke.width = 6.0;
    stroke.line_cap = LineCap::Round;

    let mut pixmap = Pixmap::new(500, 500).unwrap();
    pixmap.stroke_path(&path, &paint, &stroke, Transform::identity(), None);

    let stride = pixmap.width();
    let q_glyph: Glyph = bravura_font.glyph_id('\u{E050}').with_scale(350.0);
    let pixels = pixmap.pixels_mut();
    if let Some(q) = bravura_font.outline_glyph(q_glyph) {
        q.draw(|x, y, c| {
            let offset: usize = (y * stride + x + 100).try_into().unwrap();
            let i: u8 = (c * 255.0) as u8;
            pixels[offset] = PremultipliedColorU8::from_rgba(0, 0, 0, i).unwrap();
        });
    }    
    pixmap.save_png("image.png").unwrap();
}
