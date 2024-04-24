
import { Canvas } from "./src/wrap.js";
import './src/vexflow-debug.js';

const VF = window.VexFlow;
const width = 1024;
const height = 800;

export async function main() {

    console.log(`arg=${arg}`);

    const canvas = new Canvas(width, height);
    const ctx = VF.Renderer.buildContext(canvas, 1, width, height);

    // Script does not have lexical scope so can't see the const vf, so expose it globally.
    globalThis.VF = VF;
    globalThis.context = ctx;
    console.log('importing arg');
    await import(arg);
    console.log('done importing arg');
    canvas.saveFile('image.png');    
}

main().catch((err) => {
    console.error(`Uncaught exception: ${err}\n${err.stack}`);
});

function test() {

    const word = 'world';
    console.log(`Hello, ${word}!`);
    assert(true, 'hi');

    const c = new DrawContext(1024, 800);
    c.fillText(0xe050, 100, 120, 30.0, 1);
    c.fillText('a'.charCodeAt(0), 400, 120, 150.0, 0);
    c.beginPath();
    c.moveTo(400, 100);
    c.lineTo(200, 400);
    c.stroke();
    c.save('image.png');

    // Show that span element can parse font style
    const el = document.createElement('span');
    el.style.font = "30pt Bravura,default";
    assert(JSON.stringify(el.style.font) === "{\"font\":\"Bravura\",\"size\":30}");

    assert(Math.abs(c.measureText(0xe050, 30.0, 1)[0] - 26.840002059936523) < 1e-6, "measureText width wrong");

    const canv = document.createElement('canvas');
    let ctx = canv.getContext('2d');
    ctx.font = '100pt Garamond';
    const res = ctx.measureText('a');
    console.log(JSON.stringify(res));

}
