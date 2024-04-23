use rquickjs::{
    class::Trace, function::IntoJsFunc, Class, Context, Ctx, Function, Runtime, Error, Value
};
use tiny_skia::{LineCap, Paint, PathBuilder, Pixmap, Stroke, Transform};

#[derive(Trace)]
#[derive(Clone)]
#[rquickjs::class]
pub struct CanvasContext {
}

#[derive(Trace)]
#[rquickjs::class]
pub struct Canvas {
    width: u32,
    height: u32,
    #[qjs(skip_trace)]
    surface: Pixmap,
    #[qjs(skip_trace)]
    context: CanvasContext,
}

#[rquickjs::methods]
impl Canvas {
    #[qjs(constructor)]
    pub fn new(width: u32, height: u32) -> Self {
        Canvas {
            width,
            height,
            surface: Pixmap::new(width, height).unwrap(),
            context: CanvasContext::new()
        }
    }

    #[qjs(rename = "toDataURL")]
    pub fn to_data_url(&self) -> String {
        return String::from("<DataURL>");
    }

    #[qjs(rename = "getContext")]
    pub fn get_context(&self, _context_type: String) -> CanvasContext {
        return self.context.clone();
    }
}

#[rquickjs::methods]
impl CanvasContext {
    #[qjs(constructor)]
    pub fn new() -> Self {
        CanvasContext { }
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
    return format!("Uncaught exception: {}\n{}", ex.message().unwrap(), ex.stack().unwrap());
}

fn main() {
    let runtime = Runtime::new().unwrap();
    let ctx = Context::full(&runtime).unwrap();
    ctx.with(|ctx| {
        let global = ctx.globals();
        Class::<Canvas>::define(&global).unwrap();
        register_function(ctx.clone(), "print", print);
        match ctx.eval_file::<(),_>("src/test.js") {
            Err(Error::Exception) => println!("{}", format_exception(ctx.catch())),
            Err(e) => println!("Error! {:?}", e),
            Ok(_) => ()
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
    pixmap.save_png("image.png").unwrap();
}
