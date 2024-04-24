
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
                        const { font, size } = parseFont(this.font);
                        const fontNum = font === 'Bravura' ? 1 : 0;
                        const c = new DrawContext(1, 1, 1.0);
                        const res = c.measureText(txt.codePointAt(0) || 0, size, fontNum);
                        return {
                            width: res[0],
                            fontBoundingBoxAscent: 10.0,
                            fontBoundingBoxDescent: 10.0,
                            actualBoundingBoxAscent: 10.0,
                            actualBoundingBoxDescent: 10.0,
                        }
                    }
                };
            }
        };
    }
};

class CanvasContext {
    constructor(ctx) {
        console.debug(`CanvasContext constructed`);
        // ctx is the DrawContext
        this.ctx = ctx;
        // Need canvas field to hold final computed scaled width and height
        this.canvas = { width:0, height: 0 };
        // Whether we are drawing a path
        this.inPath = false;
    }
    // Wrapped methods
    getTransform() {
        console.debug(`CanvasContext::getTransform`);
        return 1;
    }
    fillText(txt, x, y) {
        console.debug(`CanvasContext::fillText x=${x} y=${y}`);
        const { font, size } = parseFont(this.font);
        this.ctx.fillText(txt.charCodeAt(0) || 0, x, y, size, font === 'Bravura' ? 1 : 0);
    }
    beginPath() {
        console.debug(`CanvasContext::beginPath`);
        assert(this.inPath === false);
        this.inPath = true;
        this.ctx.beginPath();
    }
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        console.debug(`CanvasContext::bezierCurveTo`);
        assert(false, "Bezier curves not implemented yet");
    }
    closePath() {
        console.debug(`CanvasContext::closePath`);
        // not sure what to do here
    }
    fill() {
        console.debug(`CanvasContext::fill`);
        assert(this.inPath === true);
        this.inPath = false;
        this.ctx.fill();
    }
    fillRect(x, y, width, height) {
        console.debug(`CanvasContext::fillRect`);
        this.ctx.fillRect(x, y, width, height);
        //cpp_fill_rect(x, y, width, height);
    }
    lineTo(x, y) {
        console.debug(`CanvasContext::lineTo`);
        assert(this.inPath);
        this.ctx.lineTo(x, y);
    }
    moveTo(x, y) {
        console.debug(`CanvasContext::moveTo`);
        assert(this.inPath);
        this.ctx.moveTo(x, y);
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
        return new CanvasContext(this.drawContext);
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
