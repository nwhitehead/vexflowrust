//
// Lightweight renderer for VexFlow
//
// Recreates canvas CanvasContext2D interface with some limitations.
//
// SUPPORTED
// * Rendering text and music glyphs
// * Antialiased lines and strokes paths
// * Antialiased rectangles and fills
// * Sharp text scaling
// * Solid colors, alpha blending
// * Transparent background, erasing background
// * Italic, bold options for text
// * Arbitrary affine drawing transformation (rotations etc.), including for text
// * Quadratic and cubic Bezier paths
// * Save/Restore drawing state stack
// * Set font size, fill style, stroke style with CSS style strings
//
// NOT SUPPORTED
// * Only supports fixed font set, built-in to renderer at compile time
// * Fonts can have italic and bold on/off but not other stuff
// * arc() can only draw circles
// * fillStyle and strokeStyle can only be colors (no gradients, dashes, etc.)
// * no shadows, blurs, filters
// * Font and color parsing is just enough to work with VexFlow, not general
// * Probably missing some functions
//

use ab_glyph::{point, Font, FontVec, Glyph, PxScaleFont, ScaleFont};
use phf::phf_map;
use regex_macro::regex;
use rquickjs::{
    class::Trace,
    context::EvalOptions,
    function::IntoJsFunc,
    loader::{BuiltinLoader, BuiltinResolver, FileResolver, ScriptLoader},
    Class, Context, Ctx, Error, Function, Runtime, Value,
};
use std::vec::Vec;
use tiny_skia::{
    BlendMode, Color, FillRule, LineCap, Paint, PathBuilder, Pixmap, PixmapPaint,
    PremultipliedColorU8, Rect, Stroke, Transform, FilterQuality
};
use std::collections::HashMap;

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
    /// Cache that maps codepoints to correct font that has the glyph
    cache: HashMap<u32, i32>,
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
            cache: HashMap::new(),
        }
    }

    pub fn lookup_glyph_finder(
        &mut self,
        codepoint: u32,
        italic: bool,
        bold: bool,
    ) -> i32 {
        return 0;
    }

    /// Decide if this codepoint should be looked up as text, not in Bravura
    /// Only needed for unicode symbols that are in Bravura but don't render nicely as inline text
    fn skip_bravura_codepoint(codepoint: u32) -> bool {
        // Skip sharp/natural/flat at \u266d..\u266f
        // In Bravura these are centered at baseline, screws up inline text like "B♯"
        return codepoint >= 0x266d && codepoint <= 0x266f;
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
        &mut self,
        codepoint: u32,
        size: f32,
        italic: bool,
        bold: bool,
        x: f32,
        y: f32,
    ) -> (PxScaleFont<&FontVec>, Glyph) {
        //let choice = self.cache.entry(codepoint).or_insert_with(|| return 5);
        let ch = char::from_u32(codepoint).expect("Illegal codepoint, is not a char");
        // First try Bravura
        // Some codepoints skip Bravura lookup
        if !Self::skip_bravura_codepoint(codepoint) {
            let chosen_font = &self.bravura_font;
            let scale = chosen_font.pt_to_px_scale(size).expect("Illegal font size");
            let glyph = chosen_font
                .glyph_id(ch)
                .with_scale_and_position(scale, point(x, y));
                // See if we have a glyph in Bravura, return it if so
            if let Some(_) = chosen_font.outline_glyph(glyph.clone()) {
                return (chosen_font.as_scaled(scale), glyph);
            }
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

/// Metrics to describe one or more glyphs
/// Attempts to be compatible with browser FontMetrics
#[derive(Trace)]
#[rquickjs::class(rename_all = "camelCase")]
pub struct FontMetrics {
    #[qjs(get, set)]
    width: f64,
    #[qjs(get, set)]
    font_bounding_box_ascent: f64,
    #[qjs(get, set)]
    font_bounding_box_descent: f64,
    #[qjs(get, set)]
    actual_bounding_box_ascent: f64,
    #[qjs(get, set)]
    actual_bounding_box_descent: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct FontInfo {
    family: Vec<String>,
    /// Size is measured in pt (and assumed to be 4/3 px which assumes dpi of 72)
    size: f64,
    bold: bool,
    italic: bool,
}

/// Drawing state is part of the context
#[derive(Clone, Debug)]
pub struct DrawState {
    line_width: f64,
    fill_style: Color,
    stroke_style: Color,
    clear_style: Color,
    font: FontInfo,
    transform: Transform,
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
    /// Drawing state
    #[qjs(skip_trace)]
    draw_state: DrawState,
    /// Save/Restore stack
    #[qjs(skip_trace)]
    stack: Vec<DrawState>,
}

static NAMED_COLORS: phf::Map<&'static str, &'static str> = phf_map! {
    "none" => "#0000",
    "transparent" => "#0000",
    "black" => "#000",
    "white" => "#fff",
    "red" => "#f00",
    "green" => "#0f0",
    "blue" => "#00f",
    "purple" => "#800080",
    "darkturquoise" => "#00ced1",
    "tomato" => "#ff6347",
    "lawngreen" => "#7cfc00",
    "orange" => "#ffa500",
    "brown" => "#a52a2a",
    "lightgreen" => "#90ee90",
};

fn unparse_color(c: &Color) -> String {
    return format!(
        "#{:02x}{:02x}{:02x}{:02x}",
        (c.red() * 255.0) as u8,
        (c.green() * 255.0) as u8,
        (c.blue() * 255.0) as u8,
        (c.alpha() * 255.0) as u8
    );
}

fn parse_font(font: &str) -> Option<FontInfo> {
    // First split on spaces (but not spaces in quotes)
    let mut result = FontInfo {
        family: vec![],
        size: 30.0,
        italic: false,
        bold: false,
    };
    let _: Vec<_> = regex!(r#"(?:[^\s"]+|"[^"]*")+"#).find_iter(font).map(|m| {
        let term = m.as_str();
        if term == "bold" {
            result.bold = true;
        } else if term == "italic" {
            result.italic = true;
        } else if let Some(captures) = regex!(r"^(\d+(\.\d*)?)pt").captures(term) {
            // See if it is a "pt" size (allow decimal)
            if let Some(value) = captures[1].parse::<f64>().ok() {
                result.size = value;
            };
        } else if let Some(captures) = regex!(r"^(\d+(\.\d*)?)px").captures(term) {
            // See if it is a "pt" size (allow decimal)
            if let Some(value) = captures[1].parse::<f64>().ok() {
                result.size = value * 3.0 / 4.0;
            };
        }
    }).collect();
    return Some(result);
}

fn parse_color(text: &str) -> Option<Color> {
    let mut current_text = text;
    // First do named color substitution
    if let Some(new_text) = NAMED_COLORS.get(text) {
        current_text = new_text;
    }
    // Failure to compile any regex expression is legitimate bug, use unwrap()
    // Any failures in hex parsing propagate to None return value
    if let Some(captures) = regex!(r"^#(.)(.)(.)$").captures(current_text) {
        let r = u8::from_str_radix(&captures[1], 16).ok()? * 17;
        let g = u8::from_str_radix(&captures[2], 16).ok()? * 17;
        let b = u8::from_str_radix(&captures[3], 16).ok()? * 17;
        return Color::from_rgba(r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0, 1.0);
    }
    if let Some(captures) = regex!(r"^#(.)(.)(.)(.)$").captures(current_text) {
        let r = u8::from_str_radix(&captures[1], 16).ok()? * 17;
        let g = u8::from_str_radix(&captures[2], 16).ok()? * 17;
        let b = u8::from_str_radix(&captures[3], 16).ok()? * 17;
        let a = u8::from_str_radix(&captures[4], 16).ok()? * 17;
        return Color::from_rgba(
            r as f32 / 255.0,
            g as f32 / 255.0,
            b as f32 / 255.0,
            a as f32 / 255.0,
        );
    }
    if let Some(captures) = regex!(r"^#(..)(..)(..)$").captures(current_text) {
        let r = u8::from_str_radix(&captures[1], 16).ok()?;
        let g = u8::from_str_radix(&captures[2], 16).ok()?;
        let b = u8::from_str_radix(&captures[3], 16).ok()?;
        return Color::from_rgba(r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0, 1.0);
    }
    if let Some(captures) = regex!(r"^#(..)(..)(..)(..)$").captures(current_text) {
        let r = u8::from_str_radix(&captures[1], 16).ok()?;
        let g = u8::from_str_radix(&captures[2], 16).ok()?;
        let b = u8::from_str_radix(&captures[3], 16).ok()?;
        let a = u8::from_str_radix(&captures[4], 16).ok()?;
        return Color::from_rgba(
            r as f32 / 255.0,
            g as f32 / 255.0,
            b as f32 / 255.0,
            a as f32 / 255.0,
        );
    }
    if let Some(captures) =
        regex!(r"^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$").captures(current_text)
    {
        // Note change to radix 10
        let r = u8::from_str_radix(&captures[1], 10).ok()?;
        let g = u8::from_str_radix(&captures[2], 10).ok()?;
        let b = u8::from_str_radix(&captures[3], 10).ok()?;
        return Color::from_rgba(r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0, 1.0);
    }
    if let Some(captures) =
        regex!(r"^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d*(\.\d*)?)\s*\)$")
            .captures(current_text)
    {
        // Note change to radix 10
        let r = u8::from_str_radix(&captures[1], 10).ok()?;
        let g = u8::from_str_radix(&captures[2], 10).ok()?;
        let b = u8::from_str_radix(&captures[3], 10).ok()?;
        let a: f32 = captures[4].parse().ok()?;
        return Color::from_rgba(r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0, a);
    }
    return Color::from_rgba(0.0, 0.0, 0.0, 1.0);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_font() {
        assert_eq!(parse_font("9pt Academico"), Some(FontInfo {
            family: vec![],
            size: 9.0,
            bold: false,
            italic: false,
        }));
        assert_eq!(parse_font("italic 10.72pt Academico"), Some(FontInfo {
            family: vec![],
            size: 10.72,
            bold: false,
            italic: true,
        }));
        assert_eq!(parse_font("bold 24pt Bravura"), Some(FontInfo {
            family: vec![],
            size: 24.0,
            bold: true,
            italic: false,
        }));
    }

    #[test]
    fn test_parse_color() {
        assert_eq!(parse_color("black"), Color::from_rgba(0.0, 0.0, 0.0, 1.0));
        assert_eq!(parse_color("blue"), Color::from_rgba(0.0, 0.0, 1.0, 1.0));
        assert_eq!(parse_color("#f00"), Color::from_rgba(1.0, 0.0, 0.0, 1.0));
        assert_eq!(parse_color("#0f0"), Color::from_rgba(0.0, 1.0, 0.0, 1.0));
        assert_eq!(parse_color("#00f"), Color::from_rgba(0.0, 0.0, 1.0, 1.0));
        assert_eq!(parse_color("#f000"), Color::from_rgba(1.0, 0.0, 0.0, 0.0));
        assert_eq!(parse_color("#0f00"), Color::from_rgba(0.0, 1.0, 0.0, 0.0));
        assert_eq!(parse_color("#00f0"), Color::from_rgba(0.0, 0.0, 1.0, 0.0));
        assert_eq!(parse_color("#000f"), Color::from_rgba(0.0, 0.0, 0.0, 1.0));
        assert_eq!(parse_color("#ff0000"), Color::from_rgba(1.0, 0.0, 0.0, 1.0));
        assert_eq!(parse_color("#00ff00"), Color::from_rgba(0.0, 1.0, 0.0, 1.0));
        assert_eq!(parse_color("#0000ff"), Color::from_rgba(0.0, 0.0, 1.0, 1.0));
        assert_eq!(
            parse_color("#ff000000"),
            Color::from_rgba(1.0, 0.0, 0.0, 0.0)
        );
        assert_eq!(
            parse_color("#00ff0000"),
            Color::from_rgba(0.0, 1.0, 0.0, 0.0)
        );
        assert_eq!(
            parse_color("#0000ff00"),
            Color::from_rgba(0.0, 0.0, 1.0, 0.0)
        );
        assert_eq!(
            parse_color("#000000ff"),
            Color::from_rgba(0.0, 0.0, 0.0, 1.0)
        );
        assert_eq!(
            parse_color("#800000"),
            Color::from_rgba((8.0 * 16.0 / 255.0) as f32, 0.0, 0.0, 1.0)
        );
        assert_eq!(
            parse_color("rgb(255,0,0)"),
            Color::from_rgba(1.0, 0.0, 0.0, 1.0)
        );
        assert_eq!(
            parse_color("rgba(0,255,0,0.5)"),
            Color::from_rgba(0.0, 1.0, 0.0, 0.5)
        );
        assert_eq!(
            parse_color("rgba(0,255,0,.5)"),
            Color::from_rgba(0.0, 1.0, 0.0, 0.5)
        );
    }

    #[test]
    fn test_unparse_color() {
        assert_eq!(
            unparse_color(&Color::from_rgba(0.0, 0.0, 0.0, 1.0).unwrap()),
            "#000000ff"
        );
        assert_eq!(
            unparse_color(&Color::from_rgba(80.0 / 255.0, 0.0, 0.0, 80.0 / 255.0).unwrap()),
            "#50000050"
        );
    }
}

/// Convert rect xywh coordinates to have positive width and height
fn normalized_rect(x: f64, y: f64, width: f64, height: f64) -> Rect {
    let xx = if width < 0.0 { x + width } else { x };
    let yy = if height < 0.0 { y + height } else { y };
    return Rect::from_xywh(
        xx as f32,
        yy as f32,
        width.abs() as f32,
        height.abs() as f32,
    )
    .unwrap();
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
    pub fn new(width: u32, height: u32, zoom: f64, background: String, foreground: String) -> Self {
        let fill_style =
            parse_color(&foreground).expect("Could not create default fillStyle color");
        let stroke_style =
            parse_color(&foreground).expect("Could not create default strokeStyle color");
        let clear_style =
            parse_color(&background).expect("Could not create default clearStyle color");
        let mut surface = Pixmap::new((width as f64 * zoom) as u32, (height as f64 * zoom) as u32)
            .expect("Could not create new PixMap of requested size");
        surface.fill(clear_style);
        let transform = Transform::identity(); //.post_translate(-0.3 / zoom as f32, -0.3 / zoom as f32);
        DrawContext {
            width,
            height,
            zoom,
            surface,
            path: None,
            font_library: FontLibrary::new(),
            draw_state: DrawState {
                line_width: 1.0,
                fill_style,
                stroke_style,
                clear_style,
                font: FontInfo {
                    family: vec![],
                    size: 30.0,
                    bold: false,
                    italic: false,
                },
                transform,
            },
            stack: vec![],
        }
    }

    #[qjs(set, rename = "fillStyle")]
    pub fn set_fill_style(&mut self, style: String) {
        if let Some(color) = parse_color(&style) {
            self.draw_state.fill_style = color;
        }
    }

    #[qjs(get, rename = "fillStyle")]
    pub fn get_fill_style(&self) -> String {
        return unparse_color(&self.draw_state.fill_style);
    }

    #[qjs(set, rename = "strokeStyle")]
    pub fn set_stroke_style(&mut self, style: String) {
        if let Some(color) = parse_color(&style) {
            self.draw_state.stroke_style = color;
        }
    }

    #[qjs(get, rename = "strokeStyle")]
    pub fn get_stroke_style(&self) -> String {
        return unparse_color(&self.draw_state.stroke_style);
    }

    #[qjs(set, rename = "lineWidth")]
    pub fn set_line_width(&mut self, width: f64) {
        self.draw_state.line_width = width;
    }

    #[qjs(get, rename = "lineWidth")]
    pub fn get_line_width(&self) -> f64 {
        return self.draw_state.line_width;
    }

    #[qjs(set, rename = "font")]
    pub fn set_font(&mut self, font: String) {
        if let Some(font_info) = parse_font(&font) {
            self.draw_state.font = font_info;
        }
    }

    #[qjs(get, rename = "font")]
    pub fn get_font(&self) -> String {
        return "30pt Bravura,Academico".to_string();
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
    pub fn get_transform(&mut self) -> Vec<f64> {
        return vec![
            self.draw_state.transform.sx as f64,
            self.draw_state.transform.kx as f64,
            self.draw_state.transform.ky as f64,
            self.draw_state.transform.sy as f64,
            self.draw_state.transform.tx as f64,
            self.draw_state.transform.ty as f64,
        ];
    }

    /// Set the current graphical transform.
    ///
    /// Format is vector: [sx, kx, ky, sy, tx, ty]
    pub fn set_transform(&mut self, t: Vec<f64>) {
        self.draw_state.transform = Transform {
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
        self.draw_state.transform = self.draw_state.transform.post_scale(sx as f32, sy as f32);
    }

    /// Add a translation to the current transformation
    pub fn translate(&mut self, x: f64, y: f64) {
        self.draw_state.transform = self
            .draw_state
            .transform
            .post_translate((-x * self.zoom) as f32, (-y * self.zoom) as f32);
    }

    /// Add a rotation to the current transformation
    /// Angle is specified in radians.
    pub fn rotate(&mut self, angle: f64) {
        self.draw_state.transform = self
            .draw_state
            .transform
            .post_rotate(angle.to_degrees() as f32);
    }

    /// Remap codepoints to fixup some issues
    fn remap_codepoint(&self, codepoint: u32) -> u32 {
        match codepoint {
            // Map "White Up-Pointing Triangle" to SMUFL "csymMajorSeventh"
            0x25b3 => 0xe873,
            // Map "Latin Small Letter O with Stroke" to SMUFL "csymHalfDiminished"
            0x00f8 => 0xe871,
            _ => codepoint
        }
    }

    /// Measure a single glyph from a codepoint.
    ///
    /// Return value is scaled to screen pixel units.
    pub fn measure_char(&mut self, codepoint: u32) -> FontMetrics {
        let mapped_codepoint = self.remap_codepoint(codepoint);
        let (scaled_font, glyph) = self.font_library.lookup_glyph(
            mapped_codepoint,
            (self.draw_state.font.size * self.zoom) as f32,
            self.draw_state.font.italic,
            self.draw_state.font.bold,
            0.0,
            0.0,
        );
        let ascent = scaled_font.ascent();
        let descent = scaled_font.descent();
        let h_advance = scaled_font.h_advance(glyph.id);
        // If it has a path, get bounds.
        if let Some(g) = scaled_font.outline_glyph(glyph) {
            let bounds = g.px_bounds();
            return FontMetrics {
                width: h_advance as f64,
                font_bounding_box_ascent: -ascent as f64,
                font_bounding_box_descent: descent as f64,
                actual_bounding_box_ascent: -bounds.min.y as f64,
                actual_bounding_box_descent: bounds.max.y as f64,
            };
        }
        // No path, return what we can from font info.
        return FontMetrics {
            width: h_advance as f64,
            font_bounding_box_ascent: -ascent as f64,
            font_bounding_box_descent: descent as f64,
            actual_bounding_box_ascent: 0.0,
            actual_bounding_box_descent: 0.0,
        };
    }

    pub fn measure_text(&mut self, string: String) -> FontMetrics {
        let mut string_iter = string.chars();
        // Get first character metrics
        if let Some(first) = string_iter.next() {
            let codepoint = first as u32;
            let mut metrics = self.measure_char(codepoint);
            // Keep going, just updating fields that might change with more chars
            for ch in string_iter {
                let extra_codepoint = ch as u32;
                let extra_metrics = self.measure_char(extra_codepoint);
                metrics.width += extra_metrics.width;
                metrics.actual_bounding_box_ascent = f64::max(metrics.actual_bounding_box_ascent, extra_metrics.actual_bounding_box_ascent);
                metrics.actual_bounding_box_descent = f64::max(metrics.actual_bounding_box_descent, extra_metrics.actual_bounding_box_descent);
            }
            return metrics;
        }
        // If we get here, we could not get first character
        // Assume we want to measure null character
        return self.measure_char(0);
    }

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
    ) -> f64 {
        let r = self.draw_state.fill_style.red() as f64;
        let g = self.draw_state.fill_style.green() as f64;
        let b = self.draw_state.fill_style.blue() as f64;
        let a = self.draw_state.fill_style.alpha() as f64;
        let total_zoom = zoom * extra_zoom as f64;
        let x_real = (x * total_zoom) as f32;
        let x_i = x_real as i32;
        let x_frac = x_real - x_i as f32;
        let y_real = (y * total_zoom) as f32;
        let y_i = y_real as i32;
        let y_frac = y_real - y_i as f32;
        let mapped_codepoint = self.remap_codepoint(codepoint);
        let (scaled_font, glyph) = self.font_library.lookup_glyph(
            mapped_codepoint,
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
                .draw_state
                .transform
                .clone()
                .post_scale((1.0 / extra_zoom) as f32, (1.0 / extra_zoom) as f32);
            let mut paint = PixmapPaint::default();
            paint.quality = FilterQuality::Bicubic;
            self.surface.draw_pixmap(
                x_i + bounds.min.x as i32,
                y_i + bounds.min.y as i32,
                rendered_glyph.as_ref(),
                &paint,
                descaled_transform,
                None,
            );
        } else {
            if mapped_codepoint == 0x20 {
                return h_advance;
            }
            println!(r"*** Codepoint \u{:x}, no glyph found", mapped_codepoint);
        }
        return h_advance;
    }

    /// Draw text string at fixed position with given color.
    pub fn fill_text(&mut self, txt: String, x: f64, y: f64) {
        let mut x_pos = x;
        // Compute extra_zoom as max of scale factors. Should look good in every situation I think.
        let extra_zoom = 1.0 * f32::max(
            self.draw_state.transform.sx.abs(),
            self.draw_state.transform.sy.abs(),
        );
        for ch in txt.chars() {
            let h_advance = self.fill_char(
                ch as u32,
                x_pos,
                y,
                self.draw_state.font.size,
                self.zoom,
                extra_zoom as f64,
                self.draw_state.font.italic,
                self.draw_state.font.bold,
            );
            x_pos += h_advance;
        }
    }

    /// Save image to a file.
    ///
    /// As a convenience, creates parent directories of file if needed.
    pub fn save_png(&mut self, filename: String) {
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
                .push_circle((x * self.zoom) as f32, (y * self.zoom) as f32, radius as f32);
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
            .push_rect(Rect::from_xywh((x * self.zoom) as f32, (y * self.zoom) as f32, (width * self.zoom) as f32, (height * self.zoom) as f32).unwrap());
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

    pub fn stroke(&mut self) {
        assert!(self.path.is_some());
        let final_path = self
            .path
            .as_mut()
            .expect("path must be created")
            .clone()
            .finish()
            .unwrap();
        let mut paint = Paint::default();
        paint.set_color(self.draw_state.stroke_style);
        paint.anti_alias = true;
        let mut stroke = Stroke::default();
        stroke.width = (self.draw_state.line_width * self.zoom) as f32;
        stroke.line_cap = LineCap::Butt;
        self.surface.stroke_path(
            &final_path,
            &paint,
            &stroke,
            self.draw_state.transform,
            None,
        );
    }

    pub fn fill(&mut self) {
        assert!(self.path.is_some());
        let r = self.draw_state.fill_style.red() as f64;
        let g = self.draw_state.fill_style.green() as f64;
        let b = self.draw_state.fill_style.blue() as f64;
        let a = self.draw_state.fill_style.alpha() as f64;
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
        self.surface.fill_path(
            &final_path,
            &paint,
            FillRule::Winding,
            self.draw_state.transform,
            None,
        );
    }

    /// Draw filled rectangle over image
    pub fn fill_rect(&mut self, x: f64, y: f64, width: f64, height: f64) {
        let mut paint = Paint::default();
        paint.set_color(self.draw_state.fill_style);
        paint.anti_alias = true;
        // Check for negative width/height, normalize
        self.surface.fill_rect(
            normalized_rect(
                x * self.zoom,
                y * self.zoom,
                width * self.zoom,
                height * self.zoom,
            ),
            &paint,
            self.draw_state.transform,
            None,
        );
    }

    /// Set surface to color given, including alpha.
    /// So this can erase canvas, or set to background color.
    pub fn clear_rect(&mut self, x: f64, y: f64, width: f64, height: f64) {
        let mut paint = Paint::default();
        paint.set_color(self.draw_state.clear_style);
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
            self.draw_state.transform,
            None,
        );
    }

    /// Clear entire image, set to fixed color
    pub fn clear(&mut self, r: f64, g: f64, b: f64, a: f64) {
        self.surface
            .fill(Color::from_rgba(r as f32, g as f32, b as f32, a as f32).unwrap());
    }

    /// Just for interfacing purposes
    pub fn set_line_dash(&self) {}

    pub fn save(&mut self) {
        self.stack.push(self.draw_state.clone());
    }

    pub fn restore(&mut self) {
        if let Some(state) = self.stack.pop() {
            self.draw_state = state;
        } else {
            println!("CanvasContext::restore() called with empty stack");
        }
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
        Class::<FontMetrics>::define(&global).unwrap();
        register_function(ctx.clone(), "print", print);
        let mut options = EvalOptions::default();
        options.global = false;
        options.strict = true;
        match ctx.eval_file_with_options::<(), _>("src/unittest.js", options) {
            Err(Error::Exception) => {
                println!("{}", format_exception(ctx.catch()));
                panic!("Exception error");
            }
            Err(e) => {
                println!("Error! {:?}", e);
                panic!("Error");
            }
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
