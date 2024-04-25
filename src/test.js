
import { Canvas } from "./src/wrap.js";
import './src/vexflow-debug.js';

const VF = window.VexFlow;
const width = 800;
const height = 600;

export async function main() {

    console.log(`arg=${arg}`);

    const canvas = new Canvas(width, height, 3.0);
    const context = VF.Renderer.buildContext(canvas, 1, width, height, '#fff');
    const { Factory } = VF;
    // Script does not have lexical scope so can't see the const vf, so expose it globally.
    globalThis.VF = VF;
    globalThis.context = context;
    const vf = new Factory({
        renderer: { elementId: null, width: 1000, height: 200 },
    });
    vf.context = context;
    globalThis.vf = vf;
    await import(arg);

    canvas.saveFile('image.png');    
}

main().catch((err) => {
    // Need to catch exceptions here, at Rust QuickJS scope we just see pending jobs and don't get the exceptions.
    // Luckily they do have stack traces.
    console.error(`Uncaught exception: ${err}\n${err.stack}`);
});
