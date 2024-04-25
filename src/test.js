
import { Canvas } from "./src/wrap.js";
import './src/vexflow-debug.js';

const VF = window.VexFlow;
const width = 800;
const height = 600;
const zoom = 1.0;

const { Factory } = VF;

class HeadlessFactory extends Factory {
    constructor(options) {
        super({ renderer: { elementId: null } });
        const opts = options || {};
        const width = opts.width || 500;
        const height = opts.height || 200;
        const zoom = opts.zoom || 1.0;
        const background = opts.background || '#fffdf5';
        const canvas = new Canvas(width, height, zoom);
        this.canvas = canvas;
        const context = VF.Renderer.buildContext(canvas, 1/*canvas backend*/, width, height, background);
        this.context = context;
    }
    saveFile(filename) {
        this.canvas.saveFile(filename);
    }
}

export async function main() {

    console.log(`arg=${arg}`);

    const vf = new HeadlessFactory({ width, height, zoom });

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
