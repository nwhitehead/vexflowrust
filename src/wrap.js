
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

// Some helpers for deep equality testing
function isPlainObject(value) {
    return value.constructor === Object;
}
function isEqual(a, b) {
    if (Object.is(a, b)) return true;
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a) && Array.isArray(b))
        return isSameArray(a, b);
    if (isPlainObject(a) && isPlainObject(b))
        return isSameObject(a, b);
    // Lots of things not supported
    return false;
}
function isSameObject(a, b) {
    const keys1 = Object.keys(a).sort();
    const keys2 = Object.keys(b).sort();
    if (!isEqual(keys1, keys2)) return false;
    for (const key of keys1) {
        if (!isEqual(a[key], b[key])) return false;
    }
    return true;
}
function isSameArray(a, b) {
    if (a.length !== b.length) return false;
    return a.every((element, index) => isEqual(element, b[index]));
}

globalThis.assert_same = function(left, right, msg) {
    if (!isEqual(left, right)) {
        throw new Error(`Assertion failed: Different values:
${'\u2550'.repeat(100)}
${JSON.stringify(left, null, 2)}
${'\u2500'.repeat(100)}
${JSON.stringify(right, null, 2)}
${'\u2550'.repeat(100)}`);
    }
}

// Need to have window object so that we get window.VexFlow
// Should not need any methods (setTimeout etc.)
globalThis.window = {};

/// Parse full fontname like "30pt Bravura,Academico" into:
///     { family: ['Bravura', 'Academico'], size: 30 }
/// This is not full CSS parsing, just enough to get by.
///
/// Supports:
///     family with fallbacks, optional quotes for spaces in family name
///     size (pt only)
///     bold
///     italic
function parseFont(font) {
    assert(font, "No argument given to parseFont");
    let res = { bold: false, italic: false };
    // First split on spaces (but not spaces in quotes)
    const parts = font.match(/(?:[^\s"]+|"[^"]*")+/g)
    for (const part of parts) {
        if (part === 'bold') {
            res['bold'] = true;
            continue;
        }
        if (part === 'italic') {
            res['italic'] = true;
            continue;
        }
        const sizeMatch = part.match(/^(\d+(\.\d*)?)pt/);
        if (sizeMatch) {
            res['size'] = Number(sizeMatch[1]);
            continue;
        }
        // If we get here, assume is font family maybe with fallbacks
        let familyParts = part.split(',');
        // Remove any quotes around family names
        for (let i = 0; i < familyParts.length; i++) {
            if (familyParts[i].startsWith('"') && familyParts[i].endsWith('"')) {
                familyParts[i] = familyParts[i].replaceAll('"', '')
            }
        }
        res['family'] = familyParts;
    }
    return res;
}

assert_same(parseFont('30pt Bravura,Academico'), {
    family: ['Bravura', 'Academico'],
    size: 30,
    bold: false,
    italic: false,
});
assert_same(parseFont('9pt Academico'), {
    family: ['Academico'],
    size: 9,
    bold: false,
    italic: false,
});
assert_same(parseFont('italic 9pt Academico'), {
    family: ['Academico'],
    size: 9,
    italic: true,
    bold: false,
});
assert_same(parseFont('italic 10.72pt Academico'), {
    family: ['Academico'],
    size: 10.72,
    italic: true,
    bold: false,
});
assert_same(parseFont('bold 12pt Lato'), {
    family: ['Lato'],
    size: 12,
    bold: true,
    italic: false,
});
assert_same(parseFont('9pt Academico,"EB Garamond"'), {
    family: ['Academico', 'EB Garamond'],
    size: 9,
    bold: false,
    italic: false,
});

function measureTextLocal(drawContext, txt, size, italic) {
    let res = {};
    // Make sure txt is nonempty, measure null codepoint if given nothing
    txt = txt || "\0";
    for(let i = 0; i < txt.length; i++) {
        const metrics = drawContext.measureText(txt.codePointAt(i), size, italic);
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
    return res;
}

globalThis.document = {
    getElementById(id) {
        // Should never get here
        console.log(`id=${id}`);
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
                        const { size, italic } = parseFont(this.font);
                        const c = new DrawContext(1, 1, 1.0);
                        return measureTextLocal(c, txt, size, italic);
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
        this.offset = { x:-0.3/zoom, y:-0.3/zoom };
    }
    // Wrapped methods
    getTransform() {
        console.debug(`CanvasContext::getTransform`);
        return 1;
    }
    fillText(txt, x, y) {
        console.log(`fillText this.font=${this.font}`);
        const { size, italic } = parseFont(this.font);
        console.debug(`CanvasContext::fillText txt=${txt} x=${x} y=${y} size=${size}`);
        this.ctx.fillText(txt, x + this.offset.x, y + this.offset.y, size, italic);
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
        this.ctx.moveTo(x + this.offset.x, y + this.offset.y);
    }
    quadraticCurveTo(cpx, cpy, x, y) {
        console.debug(`CanvasContext::quadraticCurveTo`);
        assert(this.inPath);
        this.ctx.quadraticCurveTo(cpx + this.offset.x, cpy + this.offset.y, x + this.offset.x, y + this.offset.y);
    }
    measureText(txt) {
        console.debug(`CanvasContext::measureText`);
        const { size, italic } = parseFont(this.font);
        return measureTextLocal(this.ctx, txt, size, italic);
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
        console.debug(`CanvasContext::fillRect ${x + this.offset.x}, ${y + this.offset.y}, ${width}, ${height}`);
        this.ctx.fillRect(x + this.offset.x, y + this.offset.y, width, height, 0, 0, 0);
    }
    clearRect(x, y, width, height) {
        console.debug(`CanvasContext::clearRect(${x}, ${y}, ${width}, ${height})`);
        this.ctx.fillRect(x + this.offset.x, y + this.offset.y, width, height, 1, 1, 1);
    }
    lineTo(x, y) {
        console.debug(`CanvasContext::lineTo`);
        assert(this.inPath);
        this.ctx.lineTo(x + this.offset.x, y + this.offset.y);
    }
    moveTo(x, y) {
        console.debug(`CanvasContext::moveTo`);
        assert(this.inPath);
        this.ctx.moveTo(x + this.offset.x, y + this.offset.y);
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
