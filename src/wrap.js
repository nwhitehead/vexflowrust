
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
    //assert(txt.length <= 1, 'cannot measure more than 1 glyph at a time');
    const res = this.ctx.measureText(txt.codePointAt(0) || 0, size);
    return {
        width: res[0],
        fontBoundingBoxAscent: res[2],
        fontBoundingBoxDescent: res[3],
        actualBoundingBoxAscent: res[4],
        actualBoundingBoxDescent: res[5],
    }

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
                        txt = txt || ' ';
                        console.debug(`TempCanvasContext::measureText`);
                        if (txt && txt.length > 1) {
                            console.log(`TempCanvasContext::measureText too long txt=${txt}`);
                        }
                        //assert(txt.length <= 1, 'cannot measure more than 1 glyph at a time');
                        const { font, size } = parseFont(this.font);
                        const c = new DrawContext(1, 1, 1.0);
                        const res = c.measureText(txt.codePointAt(0) || 0, size);
                        return {
                            width: res[0],
                            fontBoundingBoxAscent: res[2],
                            fontBoundingBoxDescent: res[3],
                            actualBoundingBoxAscent: res[4],
                            actualBoundingBoxDescent: res[5],
                        }
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
        //assert(txt.length <= 1, 'txt too long');
        if (txt.length > 1) {
            console.log(`fillText too long txt=${txt}`);
        }
        const { font, size } = parseFont(this.font);
        console.debug(`CanvasContext::fillText x=${x} y=${y} size=${size} font=${font}`);
        this.ctx.fillText(txt.charCodeAt(0) || 0, x + this.textOffset.x, y + this.textOffset.y, size, font);
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
        assert(txt.length <= 1, 'cannot measure more than 1 glyph at a time');
        const { font, size } = parseFont(this.font);
        const res = this.ctx.measureText(txt.codePointAt(0) || 0, size, font);
        return {
            width: res[0],
            fontBoundingBoxAscent: res[2],
            fontBoundingBoxDescent: res[3],
            actualBoundingBoxAscent: res[4],
            actualBoundingBoxDescent: res[5],
        }
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
        this.ctx.fillRect(x + this.rectOffset.x, y + this.rectOffset.y, width, height);
    }
    clearRect(x, y, width, height) {
        console.debug(`CanvasContext::clearRect(${x}, ${y}, ${width}, ${height})`);
        this.ctx.clearRect(x + this.rectOffset.x, y + this.rectOffset.y, width, height);
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
