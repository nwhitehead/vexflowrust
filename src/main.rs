use ab_glyph::{point, Font, FontVec, Glyph, PxScaleFont, ScaleFont};
use rquickjs::{
    class::Trace,
    context::EvalOptions,
    function::IntoJsFunc,
    loader::{BuiltinLoader, BuiltinResolver, FileResolver, ScriptLoader},
    Class, Context, Ctx, Error, Function, Runtime, Value,
};
use tiny_skia::{
    BlendMode, Color, FillRule, LineCap, Paint, PathBuilder, Pixmap, PixmapPaint,
    PremultipliedColorU8, Rect, Stroke, Transform,
};

pub struct FontLibrary {
    bravura_font: FontVec,
    regular_font: FontVec,
    italic_font: FontVec,
    bold_font: FontVec,
    bold_italic_font: FontVec,
}

impl FontLibrary {
    pub fn new() -> Self {
        FontLibrary {
            bravura_font: FontVec::try_from_vec(include_bytes!("../fonts/Bravura.otf").to_vec())
                .unwrap(),
            regular_font: FontVec::try_from_vec(
                include_bytes!("../fonts/AcademicoRegular.otf").to_vec(),
            )
            .unwrap(),
            italic_font: FontVec::try_from_vec(
                include_bytes!("../fonts/AcademicoItalic.otf").to_vec(),
            )
            .unwrap(),
            bold_font: FontVec::try_from_vec(include_bytes!("../fonts/AcademicoBold.otf").to_vec())
                .unwrap(),
            bold_italic_font: FontVec::try_from_vec(
                include_bytes!("../fonts/AcademicoBoldItalic.otf").to_vec(),
            )
            .unwrap(),
        }
    }

    pub fn lookup_glyph(
        &self,
        codepoint: u32,
        size: f32,
        italic: bool,
        bold: bool,
        x: f32,
        y: f32,
    ) -> (PxScaleFont<&FontVec>, Glyph) {
        let ch = char::from_u32(codepoint).unwrap();
        // First try Bravura
        let chosen_font = &self.bravura_font;
        let scale = chosen_font.pt_to_px_scale(size).unwrap();
        let glyph = chosen_font
            .glyph_id(ch)
            .with_scale_and_position(scale, point(x, y));
        if let Some(_) = chosen_font.outline_glyph(glyph.clone()) {
            return (chosen_font.as_scaled(scale), glyph);
        }
        // Next try fallbacks based on italic/bold
        let chosen_font = if italic {
            if bold {
                &self.bold_italic_font
            } else {
                &self.italic_font
            }
        } else {
            if bold {
                &self.bold_font
            } else {
                &self.regular_font
            }
        };
        let scale = chosen_font.pt_to_px_scale(size).unwrap();
        let glyph2 = chosen_font
            .glyph_id(ch)
            .with_scale_and_position(scale, point(x, y));
        return (chosen_font.as_scaled(scale), glyph2);
    }
}

#[derive(Trace)]
#[rquickjs::class]
pub struct DrawContext {
    width: u32,
    height: u32,
    zoom: f64,
    #[qjs(skip_trace)]
    surface: Pixmap,
    font: String,
    #[qjs(skip_trace)]
    path: Option<PathBuilder>,
    #[qjs(skip_trace)]
    font_library: FontLibrary,
    #[qjs(skip_trace)]
    transform: Transform,
}

#[rquickjs::methods]
impl DrawContext {
    #[qjs(constructor)]
    pub fn new(width: u32, height: u32, zoom: f64) -> Self {
        DrawContext {
            width,
            height,
            zoom,
            surface: Pixmap::new((width as f64 * zoom) as u32, (height as f64 * zoom) as u32)
                .unwrap(),
            font: "".to_string(),
            path: None,
            font_library: FontLibrary::new(),
            transform: Transform::identity(),
        }
    }

    #[qjs(rename = "getTransform")]
    pub fn get_transform(&mut self) -> std::vec::Vec<f64> {
        return vec![
            self.transform.sx as f64,
            self.transform.kx as f64,
            self.transform.ky as f64,
            self.transform.sy as f64,
            self.transform.tx as f64,
            self.transform.ty as f64,
        ];
    }

    #[qjs(rename = "setTransform")]
    pub fn set_transform(&mut self, t: std::vec::Vec<f64>) {
        self.transform = Transform {
            sx: t[0] as f32,
            kx: t[1] as f32,
            ky: t[2] as f32,
            sy: t[3] as f32,
            tx: t[4] as f32,
            ty: t[5] as f32,
        }
    }

    pub fn scale(&mut self, sx: f64, sy: f64) {
        self.transform = self.transform.post_scale(sx as f32, sy as f32);
    }

    pub fn translate(&mut self, x: f64, y: f64) {
        self.transform = self
            .transform
            .post_translate((-x * self.zoom) as f32, (-y * self.zoom) as f32);
    }

    pub fn rotate(&mut self, angle: f64) {
        self.transform = self.transform.post_rotate(angle.to_degrees() as f32);
    }

    #[qjs(rename = "measureText")]
    pub fn measure_text(
        &mut self,
        txtch: u32,
        size: f64,
        italic: bool,
        bold: bool,
    ) -> std::vec::Vec<f64> {
        let (scaled_font, glyph) = self.font_library.lookup_glyph(
            txtch,
            (size * self.zoom) as f32,
            italic,
            bold,
            0.0,
            0.0,
        );
        let ascent = scaled_font.ascent();
        let descent = scaled_font.descent();
        let h_advance = scaled_font.h_advance(glyph.id);
        let v_advance = scaled_font.v_advance(glyph.id);
        if let Some(g) = scaled_font.outline_glyph(glyph) {
            let bounds = g.px_bounds();
            return vec![
                h_advance as f64,
                v_advance as f64,
                ascent as f64,
                descent as f64,
                bounds.min.y as f64,
                bounds.max.y as f64,
            ];
        }
        return vec![
            h_advance as f64,
            v_advance as f64,
            ascent as f64,
            descent as f64,
            0.0,
            0.0,
        ];
    }

    #[qjs(rename = "fillText")]
    pub fn fill_text(
        &mut self,
        txt: String,
        x: f64,
        y: f64,
        size: f64,
        italic: bool,
        bold: bool,
        r: f64,
        g: f64,
        b: f64,
        a: f64,
    ) {
        let mut x_pos = x;
        for ch in txt.chars() {
            // We can have scale factors in self.transform and self.zoom
            // If self.transform is also zooming in, need to render more pixels in our glyph pixmap
            // Do this by scaling before rending glyph, then give de-scaled transform to draw_pixmap.
            let extra_zoom = f32::max(self.transform.sx.abs(), self.transform.sy.abs());
            let total_zoom = self.zoom * extra_zoom as f64;
            let x_real = (x_pos * total_zoom) as f32;
            let x_i = x_real as i32;
            let x_frac = x_real - x_i as f32;
            let y_real = (y * total_zoom) as f32;
            let y_i = y_real as i32;
            let y_frac = y_real - y_i as f32;
            let (scaled_font, glyph) = self.font_library.lookup_glyph(
                ch as u32,
                (size * total_zoom) as f32,
                italic,
                bold,
                x_frac,
                y_frac,
            );
            let h_advance = scaled_font.h_advance(glyph.id) as f64 / total_zoom;
            if let Some(og) = scaled_font.outline_glyph(glyph) {
                let bounds = og.px_bounds();
                let rg_width =
                    (f32::ceil(bounds.max.x) as i32 - f32::floor(bounds.min.x) as i32 + 1) as u32;
                let rg_height =
                    (f32::ceil(bounds.max.y) as i32 - f32::floor(bounds.min.y) as i32 + 1) as u32;
                let mut rendered_glyph = Pixmap::new(rg_width, rg_height).unwrap();
                let rg_pixels = rendered_glyph.pixels_mut();
                og.draw(|xx, yy, c| {
                    let true_alpha = (c as f64) * a;
                    let rg_xi = xx as u32;
                    let rg_yi = yy as u32;
                    rg_pixels[(rg_xi + rg_yi * rg_width) as usize] =
                        PremultipliedColorU8::from_rgba(
                            (r * true_alpha * 255.0) as u8,
                            (g * true_alpha * 255.0) as u8,
                            (b * true_alpha * 255.0) as u8,
                            (true_alpha * 255.0) as u8,
                        )
                        .unwrap();
                });
                let descaled_transform = self.transform.clone().post_scale((1.0 / extra_zoom) as f32, (1.0 / extra_zoom) as f32);
                self.surface.draw_pixmap(
                    x_i + bounds.min.x as i32,
                    y_i + bounds.min.y as i32,
                    rendered_glyph.as_ref(),
                    &PixmapPaint::default(),
                    descaled_transform,
                    None,
                );
                x_pos += h_advance;
            }
        }
    }

    pub fn save(&mut self, filename: String) {
        let filepath = std::path::Path::new(&filename);
        if let Some(p) = filepath.parent() {
            std::fs::create_dir_all(p).expect("Could not create directory");
        };
        self.surface.save_png(filename).unwrap();
    }

    #[qjs(rename = "beginPath")]
    pub fn begin_path(&mut self) {
        self.path = Some(PathBuilder::new());
    }

    #[qjs(rename = "moveTo")]
    pub fn move_to(&mut self, x: f64, y: f64) {
        assert!(self.path.is_some());
        self.path
            .as_mut()
            .expect("path must be created")
            .move_to((x * self.zoom) as f32, (y * self.zoom) as f32);
    }

    #[qjs(rename = "lineTo")]
    pub fn line_to(&mut self, x: f64, y: f64) {
        assert!(self.path.is_some());
        self.path
            .as_mut()
            .expect("path must be created")
            .line_to((x * self.zoom) as f32, (y * self.zoom) as f32);
    }

    #[qjs(rename = "closePath")]
    pub fn close_path(&mut self) {
        assert!(self.path.is_some());
        self.path.as_mut().expect("path must be created").close();
    }

    #[qjs(rename = "quadraticCurveTo")]
    pub fn quadratic_curve_to(&mut self, x1: f64, y1: f64, x: f64, y: f64) {
        assert!(self.path.is_some());
        self.path.as_mut().expect("path must be created").quad_to(
            (x1 * self.zoom) as f32,
            (y1 * self.zoom) as f32,
            (x * self.zoom) as f32,
            (y * self.zoom) as f32,
        );
    }

    pub fn arc(&mut self, x: f64, y: f64, radius: f64, start_angle: f64, end_angle: f64, _counterclockwise: bool) {
        assert!(self.path.is_some());
        if start_angle == 0.0 && (end_angle - std::f64::consts::TAU).abs() < 1e-10 {
            self.path.as_mut().expect("path must be created").push_circle(x as f32, y as f32, radius as f32);
        } else {
            println!("Non circle arc encountered, ignoring");
        }
    }

    pub fn rect(&mut self, x: f64, y: f64, width: f64, height: f64) {
        assert!(self.path.is_some());
        self.path.as_mut().expect("path must be created").push_rect(Rect::from_xywh(x as f32, y as f32, width as f32, height as f32).unwrap());
    }

    #[qjs(rename = "bezierCurveTo")]
    pub fn bezier_curve_to(&mut self, x1: f64, y1: f64, x2: f64, y2: f64, x: f64, y: f64) {
        assert!(self.path.is_some());
        self.path.as_mut().expect("path must be created").cubic_to(
            (x1 * self.zoom) as f32,
            (y1 * self.zoom) as f32,
            (x2 * self.zoom) as f32,
            (y2 * self.zoom) as f32,
            (x * self.zoom) as f32,
            (y * self.zoom) as f32,
        );
    }

    pub fn stroke(&mut self, width: f64, r: f64, g: f64, b: f64, a: f64) {
        assert!(self.path.is_some());
        let final_path = self
            .path
            .as_mut()
            .expect("path must be created")
            .clone()
            .finish()
            .unwrap();
        let mut paint = Paint::default();
        paint.set_color_rgba8(
            (r * 255.0) as u8,
            (g * 255.0) as u8,
            (b * 255.0) as u8,
            (a * 255.0) as u8,
        );
        paint.anti_alias = true;
        let mut stroke = Stroke::default();
        stroke.width = (width * self.zoom) as f32;
        stroke.line_cap = LineCap::Butt;
        self.surface
            .stroke_path(&final_path, &paint, &stroke, self.transform, None);
    }

    pub fn fill(&mut self, r: f64, g: f64, b: f64, a: f64) {
        assert!(self.path.is_some());
        let final_path = self
            .path
            .as_mut()
            .expect("path must be created")
            .clone()
            .finish()
            .unwrap();
        let mut paint = Paint::default();
        paint.set_color_rgba8(
            (r * 255.0) as u8,
            (g * 255.0) as u8,
            (b * 255.0) as u8,
            (a * 255.0) as u8,
        );
        paint.anti_alias = true;
        self.surface
            .fill_path(&final_path, &paint, FillRule::Winding, self.transform, None);
    }

    #[qjs(rename = "fillRect")]
    pub fn fill_rect(&mut self, x: f64, y: f64, width: f64, height: f64, r: f64, g: f64, b: f64) {
        let mut paint = Paint::default();
        paint.set_color_rgba8((r * 255.0) as u8, (g * 255.0) as u8, (b * 255.0) as u8, 255);
        paint.anti_alias = true;
        self.surface.fill_rect(
            Rect::from_xywh(
                (x * self.zoom) as f32,
                (y * self.zoom) as f32,
                (width * self.zoom) as f32,
                (height * self.zoom) as f32,
            )
            .unwrap(),
            &paint,
            self.transform,
            None,
        );
    }

    /// Set surface to color given with alpha
    /// So this can erase canvas, or set to background color
    #[qjs(rename = "clearRect")]
    pub fn clear_rect(
        &mut self,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        r: f64,
        g: f64,
        b: f64,
        a: f64,
    ) {
        let mut paint = Paint::default();
        paint.set_color_rgba8(
            (r * 255.0) as u8,
            (g * 255.0) as u8,
            (b * 255.0) as u8,
            (a * 255.0) as u8,
        );
        paint.anti_alias = true;
        paint.blend_mode = BlendMode::Source;
        self.surface.fill_rect(
            Rect::from_xywh(
                (x * self.zoom) as f32,
                (y * self.zoom) as f32,
                (width * self.zoom) as f32,
                (height * self.zoom) as f32,
            )
            .unwrap(),
            &paint,
            self.transform,
            None,
        );
    }

    pub fn clear(&mut self, r: f64, g: f64, b: f64, a: f64) {
        self.surface
            .fill(Color::from_rgba(r as f32, g as f32, b as f32, a as f32).unwrap());
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
    let loader = (BuiltinLoader::default(), ScriptLoader::default());
    let runtime = Runtime::new().unwrap();
    let ctx = Context::full(&runtime).unwrap();
    runtime.set_loader(resolver, loader);
    ctx.with(|ctx| {
        let global = ctx.globals();
        global
            .set("arg".to_string(), args[args.len() - 1].clone())
            .unwrap();
        Class::<DrawContext>::define(&global).unwrap();
        register_function(ctx.clone(), "print", print);
        match ctx.eval_file_with_options::<(), _>(
            "src/unittest.js",
            EvalOptions {
                global: false,
                strict: true,
                backtrace_barrier: false,
            },
        ) {
            Err(Error::Exception) => println!("{}", format_exception(ctx.catch())),
            Err(e) => println!("Error! {:?}", e),
            Ok(_) => (),
        }
    });
    // Make sure to keep going until work is actually done
    while runtime.is_job_pending() {
        match runtime.execute_pending_job() {
            Ok(_) => (),
            Err(e) => println!("Error! {:?}", e),
        }
    }
}
