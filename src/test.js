
import { Canvas } from "./src/wrap.js";
import './src/vexflow-debug.js';

const VF = window.VexFlow;
const width = 800;
const height = 600;
const zoom = 2.0;
const foreground = '#222';
const background = '#fff5f0ff'; //'#fff5f0ff'; // '#0000';

const { Factory } = VF;

class HeadlessFactory extends Factory {
    constructor(options) {
        super({ renderer: { elementId: null } });
        const opts = options || {};
        const width = opts.width || 500;
        const height = opts.height || 200;
        const zoom = opts.zoom || 1.0;
        const background = opts.background || '#fff5f0ff';
        const foreground = opts.foreground || '#111';
        const canvas = new Canvas(width, height, zoom, background, foreground);
        this.canvas = canvas;
        const context = VF.Renderer.buildContext(canvas, 1/*canvas backend*/, width, height, background);
        this.context = context;
        //console.log(context.context2D.constructor);  is CanvasContext
        context.context2D.fillStyle = '#ff0000';
    }
    saveFile(filename) {
        this.canvas.saveFile(filename);
    }
}

export async function main() {

    console.log(`arg=${arg}`);

    const vf = new HeadlessFactory({ width, height, zoom, foreground, background });

    // Script does not have lexical scope so can't see the const vf, so expose it globally.
    globalThis.VF = VF;
    globalThis.context = vf.context;
    globalThis.vf = vf;
    await import(arg);

    vf.saveFile('image.png');    
}

main().catch((err) => {
    // Need to catch exceptions here, at Rust QuickJS scope we just see pending jobs and don't get the exceptions.
    // Luckily they do have stack traces.
    console.error(`Uncaught exception: ${err}\n${err.stack}`);
});
