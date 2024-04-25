
globalThis.DEBUG = true;

function anyToString(v) {
    if (v === undefined) {
        return 'undefined';
    }
    if (v === null) {
        return 'null';
    }
    return v.toString();
}

globalThis.console = {
    log(txt) {
        print(anyToString(txt));
    },
    warn(txt) {
        print(anyToString(txt));
    },
    error(txt) {
        print(anyToString(txt));
    },
    debug(txt) {
        if (DEBUG) {
            this.log(txt);
        }
    }
};

globalThis.assert = function(condition, msg) {
    if (!condition) {
        throw new Error("Assertion failed: " + msg);
    }
}

// Need to have window object so that we get window.VexFlow
// Should not need any methods (setTimeout etc.)
globalThis.window = {};

/// Parse full fontname like "30pt Bravura,Academico" into { font: 'Bravura', size: 30 }
function parseFont(fontname) {
    if (fontname === undefined) {
        return null;
    }
    const parts = fontname.split(',');
    const part = parts[0];
    const match = part.match(/^(\d+)pt (.*)/);
    if (match) {
        return {
            font: match[2],
            size: Number(match[1]),
        }
    }
    return null;
}

function measureTextLocal(drawContext, txt, size) {
    let res = {};
    // Make sure txt is nonempty, measure null codepoint if given nothing
    txt = txt || "\0";
    for(let i = 0; i < txt.length; i++) {
        const metrics = drawContext.measureText(txt.codePointAt(i), size);
        if (i == 0) {
            res = {
                width: metrics[0],
                fontBoundingBoxAscent: metrics[2] * -1.0,
                fontBoundingBoxDescent: metrics[3] * 1.0,
                actualBoundingBoxAscent: metrics[4] * -1.0,
                actualBoundingBoxDescent: metrics[5] * 1.0,
            };
        } else {
            res.width += metrics[0];
        }
    }
    console.log(`txt=${txt} width=${res.width}`);
    return res;
}

globalThis.document = {
    getElementById(id) {
        // Should never get here
        assert(false, "getElementById called");
    },
    createElement(t) {
        if (t === 'span') {
            // span element is only used for font name parsing
            let fullFont = '30pt Bravura,Academico';
            return {
                style: {
                    set font(txt) {
                        fullFont = txt;
                    },
                    get font() {
                        return parseFont(fullFont);
                    },
                },
            };
        }
        assert(t === 'canvas', `Can only create canvas got t=${t}`);
        // Canvases created during rendering are for font measuring only.
        return {
            getContext(t) {
                return {
                    measureText(txt) {
                        console.debug(`TempCanvasContext::measureText`);
                        const { size } = parseFont(this.font);
                        const c = new DrawContext(1, 1, 1.0);
                        return measureTextLocal(c, txt, size);
                    }
                };
            }
        };
    }
};

class CanvasContext {
    constructor(ctx, zoom) {
        console.debug(`CanvasContext constructed`);
        // ctx is the DrawContext
        this.ctx = ctx;
        this.zoom = zoom;
        // Need canvas field to hold final computed scaled width and height
        this.canvas = { width:0, height: 0 };
        // Whether we are drawing a path
        this.inPath = false;
        // Global offset for subpixel aliasing issues
        this.pathOffset = { x:-0.3/zoom, y:-0.3/zoom };
        this.rectOffset = { x:-0.3/zoom, y:-0.3/zoom };
        this.textOffset = { x:0.0/zoom, y:0.0/zoom };
    }
    // Wrapped methods
    getTransform() {
        console.debug(`CanvasContext::getTransform`);
        return 1;
    }
    fillText(txt, x, y) {
        const { size } = parseFont(this.font);
        console.debug(`CanvasContext::fillText txt=${txt} x=${x} y=${y} size=${size}`);
        this.ctx.fillText(txt, x + this.textOffset.x, y + this.textOffset.y, size);
    }
    beginPath() {
        console.debug(`CanvasContext::beginPath`);
        assert(this.inPath === false);
        this.inPath = true;
        this.ctx.beginPath();
    }
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        console.debug(`CanvasContext::bezierCurveTo`);
        console.error('bezierCurveTo not implemented yet');
        assert(this.inPath);
        this.ctx.moveTo(x + this.pathOffset.x, y + this.pathOffset.y);
        //assert(false, "Bezier curves not implemented yet");
    }
    quadraticCurveTo(cpx, cpy, x, y) {
        console.debug(`CanvasContext::quadraticCurveTo`);
        //console.error('quadraticCurveTo not implemented yet');
        assert(this.inPath);
        this.ctx.quadraticCurveTo(cpx + this.pathOffset.x, cpy + this.pathOffset.y, x + this.pathOffset.x, y + this.pathOffset.y);
        //assert(false, "Bezier curves not implemented yet");
    }
    measureText(txt) {
        console.debug(`CanvasContext::measureText`);
        const { size } = parseFont(this.font);
        return measureTextLocal(this.ctx, txt, size);
    }
    closePath() {
        console.debug(`CanvasContext::closePath`);
        // not sure what to do here
    }
    fill() {
        console.debug(`CanvasContext::fill`);
        assert(this.inPath === true);
        this.inPath = false;
        this.ctx.fill(0, 0, 0);
    }
    fillRect(x, y, width, height) {
        console.debug(`CanvasContext::fillRect`);
        this.ctx.fillRect(x + this.rectOffset.x, y + this.rectOffset.y, width, height, 0, 0, 0);
    }
    clearRect(x, y, width, height) {
        console.debug(`CanvasContext::clearRect(${x}, ${y}, ${width}, ${height})`);
        this.ctx.fillRect(x + this.rectOffset.x, y + this.rectOffset.y, width, height, 1, 1, 1);
    }
    lineTo(x, y) {
        console.debug(`CanvasContext::lineTo`);
        assert(this.inPath);
        this.ctx.lineTo(x + this.pathOffset.x, y + this.pathOffset.y);
    }
    moveTo(x, y) {
        console.debug(`CanvasContext::moveTo`);
        assert(this.inPath);
        this.ctx.moveTo(x + this.pathOffset.x, y + this.pathOffset.y);
    }
    restore() {
        console.debug(`CanvasContext::restore`);
        // No operation
    }
    save() {
        console.debug(`CanvasContext::save`);
        // No operation
    }
    scale(x, y) {
        console.debug(`CanvasContext::scale`);
        // No operation
    }
    stroke() {
        console.debug(`CanvasContext::stroke`);
        assert(this.inPath === true);
        this.inPath = false;
        this.ctx.stroke(this.lineWidth || 1.0);
    }
}

export class Canvas {
    constructor(width, height, zoom) {
        this.width = width;
        this.height = height;
        this.zoom = zoom || 1.0;
        this.drawContext = new DrawContext(width, height, this.zoom);
        // Set opaque page
        this.drawContext.clear(1.0, 0.99, 0.97, 1);
    }
    getContext() {
        return new CanvasContext(this.drawContext, this.zoom);
    }
    // Need to have toDataURL for type detection to pass
    toDataURL() {
        return "<URL>";
    }
    saveFile(filename) {
        this.drawContext.save(filename);
    }
}



export default {};
