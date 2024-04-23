use rquickjs::{class::Trace, Class, Context, Function, Runtime, Undefined};
use tiny_skia::{LineCap, Paint, PathBuilder, Pixmap, Stroke, Transform};

#[derive(Trace)]
#[rquickjs::class]
pub struct Canvas {
    width: i32,
    height: i32,
}

#[rquickjs::methods]
impl Canvas {
    #[qjs(constructor)]
    pub fn new(width: i32, height: i32) -> Self {
        Canvas { width, height }
    }
}

pub fn print(msg: String) {
    println!("{msg}");
}

fn main() {
    let runtime = Runtime::new().unwrap();
    let ctx = Context::full(&runtime).unwrap();
    ctx.with(|ctx| {
        let global = ctx.globals();
        Class::<Canvas>::define(&global).unwrap();
        global
            .set(
                "print",
                Function::new(ctx.clone(), print)
                    .unwrap()
                    .with_name("print")
                    .unwrap(),
            )
            .unwrap();
        ctx.eval_file::<Undefined, &str>("src/test.js").unwrap();
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
    pixmap.save_png("image.png").unwrap();
}
