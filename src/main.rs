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

/// A library of fonts that are ready to use
pub struct FontLibrary {
    /// Owned font Bravura for musical glyphs
    bravura_font: FontVec,
    /// Owned font for regular text (used for many things, e.g. fingering numbers)
    regular_font: FontVec,
    /// Owned font for italic text (often used, e.g. 8va annotation)
    italic_font: FontVec,
    /// Owned font for bold text (used for some things, e.g. certain types of tab fingerings)
    bold_font: FontVec,
    /// Owned font for bold italic text (mostly for completeness)
    bold_italic_font: FontVec,
}

impl FontLibrary {
    /// Creates a filled font library with build-in fonts.
    ///
    pub fn new() -> Self {
        FontLibrary {
            bravura_font: FontVec::try_from_vec(include_bytes!("../fonts/Bravura.otf").to_vec())
                .expect("Failed to load Bravura.otf embedded font"),
            regular_font: FontVec::try_from_vec(
                include_bytes!("../fonts/AcademicoRegular.otf").to_vec(),
            )
            .expect("Failed to load AcademicoRegular.otf embedded font"),
            italic_font: FontVec::try_from_vec(
                include_bytes!("../fonts/AcademicoItalic.otf").to_vec(),
            )
            .expect("Failed to load AcademicoItalic.otf embedded font"),
            bold_font: FontVec::try_from_vec(include_bytes!("../fonts/AcademicoBold.otf").to_vec())
                .expect("Failed to load AcademicoBold.otf embedded font"),
            bold_italic_font: FontVec::try_from_vec(
                include_bytes!("../fonts/AcademicoBoldItalic.otf").to_vec(),
            )
            .expect("Failed to load AcademicoBoldItalic.otf embedded font"),
        }
    }

    /// Given a specific codepoint, compute outline glyph
    ///
    /// No font family is given here. The FontLibrary takes care of choosing the
    /// font to use.
    ///
    /// Resolution order:
    /// 1) Musical glyphs
    /// 2) Text font with correct combination of bold/italic
    ///
    /// The position x, y is needed to account for differences in rendering
    /// based on subpixel aliasing. The x,y position passed should be fractions
    /// of pixel units.
    ///
    pub fn lookup_glyph(
        &self,
        codepoint: u32,
        size: f32,
        italic: bool,
        bold: bool,
        x: f32,
        y: f32,
    ) -> (PxScaleFont<&FontVec>, Glyph) {
        let ch = char::from_u32(codepoint).expect("Illegal codepoint, is not a char");
        // First try Bravura
        let chosen_font = &self.bravura_font;
        let scale = chosen_font.pt_to_px_scale(size).expect("Illegal font size");
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
        let scale = chosen_font.pt_to_px_scale(size).expect("Illegal font size");
        let glyph2 = chosen_font
            .glyph_id(ch)
            .with_scale_and_position(scale, point(x, y));
        return (chosen_font.as_scaled(scale), glyph2);
    }
}

/// A drawing context exposed to JS for rendering.
///
/// Owns its own surface with pixel data.
#[derive(Trace)]
#[rquickjs::class]
pub struct DrawContext {
    /// Width in pixels of surface
    width: u32,
    /// Height in pixels of surface
    height: u32,
    /// Zoom factor, 1.0 is normal, higher is more zoomed in
    zoom: f64,
    /// Pixel data for image
    #[qjs(skip_trace)]
    surface: Pixmap,
    /// Current path being constructed with drawing commands
    #[qjs(skip_trace)]
    path: Option<PathBuilder>,
    /// Font library for resolving codepoints
    #[qjs(skip_trace)]
    font_library: FontLibrary,
    /// Current graphical transform
    #[qjs(skip_trace)]
    transform: Transform,
}

#[rquickjs::methods(rename_all = "camelCase")]
impl DrawContext {
    /// Create new image with zoom factor.
    ///
    /// Size of actual image is zoom factor multiplied by given width and
    /// height. Example:
    ///
    ///     DrawContext::new(100, 100, 2.0)
    ///
    /// The above creates an image of size 200x200.
    ///
    #[qjs(constructor)]
    pub fn new(width: u32, height: u32, zoom: f64) -> Self {
        DrawContext {
            width,
            height,
            zoom,
            surface: Pixmap::new((width as f64 * zoom) as u32, (height as f64 * zoom) as u32)
                .expect("Could not create new PixMap of requested size"),
            path: None,
            font_library: FontLibrary::new(),
            transform: Transform::identity(),
        }
    }

    /// Get the current graphical transform.
    ///
    /// Format is vector: [sx, kx, ky, sy, tx, ty]
    ///
    /// Matrix is:
    ///
    ///     sx ky tx
    ///     kx sy ty
    ///
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

    /// Set the current graphical transform.
    ///
    /// Format is vector: [sx, kx, ky, sy, tx, ty]
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

    /// Apply a scale to the current transformation
    pub fn scale(&mut self, sx: f64, sy: f64) {
        self.transform = self.transform.post_scale(sx as f32, sy as f32);
    }

    /// Add a translation to the current transformation
    pub fn translate(&mut self, x: f64, y: f64) {
        self.transform = self
            .transform
            .post_translate((-x * self.zoom) as f32, (-y * self.zoom) as f32);
    }

    /// Add a rotation to the current transformation
    /// Angle is specified in radians.
    pub fn rotate(&mut self, angle: f64) {
        self.transform = self.transform.post_rotate(angle.to_degrees() as f32);
    }

    /// Measure a single glyph from a codepoint.
    ///
    /// Return value is [ h_advance, ascent, descent, glyph_top, glyph_bottom ]
    pub fn measure_text(
        &mut self,
        codepoint: u32,
        size: f64,
        italic: bool,
        bold: bool,
    ) -> std::vec::Vec<f64> {
        let (scaled_font, glyph) = self.font_library.lookup_glyph(
            codepoint,
            (size * self.zoom) as f32,
            italic,
            bold,
            0.0,
            0.0,
        );
        let ascent = scaled_font.ascent();
        let descent = scaled_font.descent();
        let h_advance = scaled_font.h_advance(glyph.id);
        // If it has a path, get bounds.
        if let Some(g) = scaled_font.outline_glyph(glyph) {
            let bounds = g.px_bounds();
            return vec![
                h_advance as f64,
                -ascent as f64,
                descent as f64,
                -bounds.min.y as f64,
                bounds.max.y as f64,
            ];
        }
        // No path, return what we can from font info.
        return vec![
            h_advance as f64,
            -ascent as f64,
            descent as f64,
            0.0,
            0.0,
        ];
    }

    // #[qjs(rename = "measureString")]
    // pub fn measure_string(
    //     &mut self,
    //     string: String,
    //     size: f64,
    //     italic: bool,
    //     bold: bool,
    // ) -> Value {
    //     let mut string_iter = string.chars();
    //     // Get first character metrics
    //     if let Some(first) = string_iter.next() {
    //         let codepoint = first as u32;
    //         let mut metrics: std::vec::Vec<f64> = self.measure_text(codepoint, size, italic, bold);
    //         // Keep going, just updating total width
    //         for ch in string_iter {
    //             let extra_codepoint = ch as u32;
    //             let extra_metrics = self.measure_text(extra_codepoint, size, italic, bold);
    //             metrics[0] += extra_metrics[0];
    //         }
    //         let mut res_value = Object::new().unwrap();
    //         return res_value.into();
    //     }
    //     // If we get here, we could not get first character
    //     // Assume we want to measure null character
    //     panic!("blah");
    //     //return self.measure_text(0, size, italic, bold);
    // }

    /// Draw one codepoint (glyph), return how much to advance in x direction
    ///
    /// Algorithm is to render glyph to fresh pixmap with anti-aliasing and
    /// final color, then draw the glyph pixmap to the surface through the
    /// transformation matrix. This allows text to be scaled, rotated, etc. and
    /// to have alpha blending with existing surface.
    ///
    /// extra_zoom parameter is extra factor to avoid pixellation during
    /// rendering for transformations that do scaling. Avoids doing things like
    /// drawing pixel glyph bitmap with scale factor of 2 (blocky pixels).
    fn fill_char(
        &mut self,
        codepoint: u32,
        x: f64,
        y: f64,
        size: f64,
        zoom: f64,
        extra_zoom: f64,
        italic: bool,
        bold: bool,
        r: f64,
        g: f64,
        b: f64,
        a: f64,
    ) -> f64 {
        let total_zoom = zoom * extra_zoom as f64;
        let x_real = (x * total_zoom) as f32;
        let x_i = x_real as i32;
        let x_frac = x_real - x_i as f32;
        let y_real = (y * total_zoom) as f32;
        let y_i = y_real as i32;
        let y_frac = y_real - y_i as f32;
        let (scaled_font, glyph) = self.font_library.lookup_glyph(
            codepoint,
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
            let mut rendered_glyph =
                Pixmap::new(rg_width, rg_height).expect("Could not create PixMap to render glyph");
            let rg_pixels = rendered_glyph.pixels_mut();
            og.draw(|xx, yy, c| {
                let true_alpha = (c as f64) * a;
                let rg_xi = xx as u32;
                let rg_yi = yy as u32;
                if let Some(color) = PremultipliedColorU8::from_rgba(
                    (r * true_alpha * 255.0) as u8,
                    (g * true_alpha * 255.0) as u8,
                    (b * true_alpha * 255.0) as u8,
                    (true_alpha * 255.0) as u8,
                ) {
                    rg_pixels[(rg_xi + rg_yi * rg_width) as usize] = color;
                }
            });
            let descaled_transform = self
                .transform
                .clone()
                .post_scale((1.0 / extra_zoom) as f32, (1.0 / extra_zoom) as f32);
            self.surface.draw_pixmap(
                x_i + bounds.min.x as i32,
                y_i + bounds.min.y as i32,
                rendered_glyph.as_ref(),
                &PixmapPaint::default(),
                descaled_transform,
                None,
            );
        }
        return h_advance;
    }

    /// Draw text string at fixed position with given color.
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
        // Compute extra_zoom as max of scale factors. Should look good in every situation I think.
        let extra_zoom = f32::max(self.transform.sx.abs(), self.transform.sy.abs());
        for ch in txt.chars() {
            let h_advance = self.fill_char(
                ch as u32,
                x_pos,
                y,
                size,
                self.zoom,
                extra_zoom as f64,
                italic,
                bold,
                r,
                g,
                b,
                a,
            );
            x_pos += h_advance;
        }
    }

    /// Save image to a file.
    ///
    /// As a convenience, creates parent directories of file if needed.
    pub fn save(&mut self, filename: String) {
        let filepath = std::path::Path::new(&filename);
        if let Some(p) = filepath.parent() {
            std::fs::create_dir_all(p).expect("Could not create directory");
        };
        self.surface.save_png(filename).unwrap();
    }

    pub fn begin_path(&mut self) {
        self.path = Some(PathBuilder::new());
    }

    pub fn move_to(&mut self, x: f64, y: f64) {
        assert!(self.path.is_some());
        self.path
            .as_mut()
            .expect("path must be created")
            .move_to((x * self.zoom) as f32, (y * self.zoom) as f32);
    }

    pub fn line_to(&mut self, x: f64, y: f64) {
        assert!(self.path.is_some());
        self.path
            .as_mut()
            .expect("path must be created")
            .line_to((x * self.zoom) as f32, (y * self.zoom) as f32);
    }

    pub fn close_path(&mut self) {
        assert!(self.path.is_some());
        self.path.as_mut().expect("path must be created").close();
    }

    pub fn quadratic_curve_to(&mut self, x1: f64, y1: f64, x: f64, y: f64) {
        assert!(self.path.is_some());
        self.path.as_mut().expect("path must be created").quad_to(
            (x1 * self.zoom) as f32,
            (y1 * self.zoom) as f32,
            (x * self.zoom) as f32,
            (y * self.zoom) as f32,
        );
    }

    pub fn arc(
        &mut self,
        x: f64,
        y: f64,
        radius: f64,
        start_angle: f64,
        end_angle: f64,
        _counterclockwise: bool,
    ) {
        assert!(self.path.is_some());
        if start_angle == 0.0 && (end_angle - std::f64::consts::TAU).abs() < 1e-10 {
            self.path
                .as_mut()
                .expect("path must be created")
                .push_circle(x as f32, y as f32, radius as f32);
        } else {
            println!("Non circle arc encountered, ignoring");
        }
    }

    /// Add rectangle to current path
    pub fn rect(&mut self, x: f64, y: f64, width: f64, height: f64) {
        assert!(self.path.is_some());
        self.path
            .as_mut()
            .expect("path must be created")
            .push_rect(Rect::from_xywh(x as f32, y as f32, width as f32, height as f32).unwrap());
    }

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

    /// Draw filled rectangle over image
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

    /// Set surface to color given, including alpha.
    /// So this can erase canvas, or set to background color.
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

    /// Clear entire image, set to fixed color
    pub fn clear(&mut self, r: f64, g: f64, b: f64, a: f64) {
        self.surface
            .fill(Color::from_rgba(r as f32, g as f32, b as f32, a as f32).unwrap());
    }
}

/// Print to console
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
        let ex = v.as_exception().expect("Value that had v.is_error() || v.is_exception() could not be converted with v.as_exception()");
        return format!(
            "Uncaught exception: {}\n{}",
            ex.message().unwrap_or_else(|| "<no msg>".to_string()),
            ex.stack().unwrap_or_else(|| "<no stack>".to_string())
        );
    }
    if v.is_string() {
        if let Some(s) = v.into_string() {
            return s
                .to_string()
                .unwrap_or_else(|_| "<no string value>".to_string());
        }
        return "<unconvertable string>".to_string();
    }
    // Fallback to debugger output if we get something unknown, make sure to show something at least.
    return format!("Uncaught exception: {:?}", v);
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let resolver = (
        BuiltinResolver::default(),
        FileResolver::default().with_path("./"),
    );
    let loader = (BuiltinLoader::default(), ScriptLoader::default());
    let runtime = Runtime::new().expect("Could not create JS Runtime");
    let ctx = Context::full(&runtime).expect("Could not create JS Context");
    runtime.set_loader(resolver, loader);
    ctx.with(|ctx| {
        let global = ctx.globals();
        global
            .set("arg".to_string(), args[args.len() - 1].clone())
            .unwrap();
        Class::<DrawContext>::define(&global).unwrap();
        register_function(ctx.clone(), "print", print);
        let mut options = EvalOptions::default();
        options.global = false;
        options.strict = true;
        options.promise = true;
        match ctx.eval_file_with_options::<(), _>(
            "src/unittest.js", options
        ) {
            Err(Error::Exception) => println!("{}", format_exception(ctx.catch())),
            Err(e) => println!("Error! {:?}", e),
            Ok(_) => (),
        }
    });
}
