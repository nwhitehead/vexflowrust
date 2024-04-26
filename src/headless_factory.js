
import { Canvas } from "./src/wrap.js";
import './src/vexflow-debug.js';

const VF = window.VexFlow;

const { Factory } = VF;

export class HeadlessFactory extends Factory {
    constructor(options) {
        const width = opts.width || 500;
        const height = opts.height || 200;
        super({ renderer: { elementId: null, width, height } });
        const opts = options || {};
        const zoom = opts.zoom || 1.0;
        const background = opts.background || '#fff5f0ff';
        const foreground = opts.foreground || '#111';
        const canvas = new Canvas(width, height, zoom, background, foreground, forceForeground);
        this.canvas = canvas;
        const context = VF.Renderer.buildContext(canvas, 1/*canvas backend*/, width, height, background);
        this.context = context;
    }
    saveFile(filename) {
        this.canvas.saveFile(filename);
    }
}
