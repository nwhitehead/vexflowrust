
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
                        const c = new DrawContext(1, 1);
                        const res = c.measureText(txt.codePointAt(0) || 0, size, fontNum);
                        return {
                            width: res[0],
                        }
                    }
                };
            }
        };
    }
};

class CanvasContext {
    constructor(ctx) {
        console.log(`CanvasContext constructed`);
        this.ctx = ctx;
        // Need canvas field to hold final computed scaled width and height
        this.canvas = { width:0, height: 0 };
        // Current pen position
        this.position = { x: 0, y: 0 };
        // Whether we are drawing a path
        this.inPath = false;
    }
    // Wrapped methods
    getTransform() {
        console.log(`CanvasContext::getTransform`);
        return 1;
    }
    fillText(txt, x, y) {
        console.log(`CanvasContext::fillText`);
        const { font, size } = parseFont(this.font);
    }
    beginPath() {
        console.log(`CanvasContext::beginPath`);
        assert(this.inPath === false);
        this.inPath = true;
    }
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        console.log(`CanvasContext::bezierCurveTo`);
        assert(false, "Bezier curves not implemented yet");
    }
    closePath() {
        console.log(`CanvasContext::closePath`);
        // not sure what to do here
    }
    fill() {
        console.log(`CanvasContext::fill`);
        assert(this.inPath === true);
        this.inPath = false;
    }
    fillRect(x, y, width, height) {
        console.log(`CanvasContext::fillRect`);
        cpp_fill_rect(x, y, width, height);
    }
    lineTo(x, y) {
        console.log(`CanvasContext::lineTo`);
        assert(this.inPath);
        cpp_draw_line(this.position.x, this.position.y, x, y);
        this.position = { x, y };
    }
    moveTo(x, y) {
        console.log(`CanvasContext::moveTo`);
        assert(this.inPath);
        this.position = { x, y };
    }
    restore() {
        console.log(`CanvasContext::restore`);
    }
    save() {
        console.log(`CanvasContext::save`);
    }
    scale(x, y) {
        console.log(`CanvasContext::scale`);
    }
    stroke() {
        console.log(`CanvasContext::stroke`);
        assert(this.inPath === true);
        this.inPath = false;
    }
}

export class Canvas {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.drawContext = new DrawContext(width, height);
    }
    getContext() {
        return new CanvasContext(this.drawContext);
    }
    // Need to have toDataURL for type detection to pass
    toDataURL() {
        return "<URL>";
    }
}



export default {};
