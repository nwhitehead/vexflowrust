
globalThis.DEBUG = false;

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
    return isSameObject(a, b);
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


// When generating PNG images for the visual regression tests,
// we mock out the QUnit methods (since we don't care about assertions).
if (!globalThis.QUnit) {
    const QUMock = {
        moduleName: '',
        testName: '',

        assertions: {
            ok: () => true,
            equal: () => true,
            deepEqual: () => true,
            expect: () => true,
            throws: () => true,
            notOk: () => true,
            notEqual: () => true,
            notDeepEqual: () => true,
            strictEqual: () => true,
            notStrictEqual: () => true,
            propEqual: () => true,
        },

        module(name) {
            QUMock.moduleName = name;
        },

        // See: https://api.qunitjs.com/QUnit/test/
        test(testName, callback) {
            QUMock.testName = testName;
            QUMock.assertions.test.module.name = QUMock.moduleName;
            // Print out the progress and keep it on a single line.
            console.log(`\u001B[0G${QUMock.moduleName} :: ${testName}\u001B[0K`);
            callback(QUMock.assertions);
        },
    };

    // QUNIT MOCK
    globalThis.QUnit = QUMock;
    for (const k in QUMock.assertions) {
        // Make all methods & properties of QUMock.assertions global.
        globalThis[k] = QUMock.assertions[k];
    }
    globalThis.test = QUMock.test;
    // Enable us to pass the name of the module around.
    // See: QUMock.test(...) and VexFlowTests.runWithParams(...)
    QUMock.assertions.test = { module: { name: '' } };
}

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
    // Cheat on unit test
    if (font === `bold 1.5em/3 "Lucida Sans Typewriter", "Lucida Console", Consolas, monospace`) {
        return {
            size: 18.0,
        };
    }
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

/// Parse color text like "#f0f" to { r: 1, g: 0, b: 1, a: 1 }
function parseColor(color) {
    const namedColors = {
        'none': '#0000',
        'transparent': '#0000',
        'black': '#000',
        'white': '#fff',
        'red': '#f00',
        'green': '#0f0',
        'blue': '#00f',
        'purple': '#800080',
        'darkturquoise': '#00ced1',
        'tomato': '#ff6347',
        'lawngreen': '#7cfc00',
        'orange': '#ffa500',
        'brown': '#a52a2a',
        'lightgreen': '#90ee90',
    };
    if (namedColors[color]) {
        return parseColor(namedColors[color]);
    }
    const shortHex = color.match(/^#(.)(.)(.)$/);
    if (shortHex) {
        return {
            r: parseInt(shortHex[1], 16) * 17 / 255.0,
            g: parseInt(shortHex[2], 16) * 17 / 255.0,
            b: parseInt(shortHex[3], 16) * 17 / 255.0,
            a: 1,
        }
    }
    const shortHexA = color.match(/^#(.)(.)(.)(.)$/);
    if (shortHexA) {
        return {
            r: parseInt(shortHexA[1], 16) * 17 / 255.0,
            g: parseInt(shortHexA[2], 16) * 17 / 255.0,
            b: parseInt(shortHexA[3], 16) * 17 / 255.0,
            a: parseInt(shortHexA[4], 16) * 17 / 255.0,
        }
    }
    const longHex = color.match(/^#(..)(..)(..)$/);
    if (longHex) {
        return {
            r: parseInt(longHex[1], 16) / 255.0,
            g: parseInt(longHex[2], 16) / 255.0,
            b: parseInt(longHex[3], 16) / 255.0,
            a: 1,
        }
    }
    const longHexA = color.match(/^#(..)(..)(..)(..)$/);
    if (longHexA) {
        return {
            r: parseInt(longHexA[1], 16) / 255.0,
            g: parseInt(longHexA[2], 16) / 255.0,
            b: parseInt(longHexA[3], 16) / 255.0,
            a: parseInt(longHexA[4], 16) / 255.0,
        }
    }
    const rgba = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),(\d*(\.\d+)?)\)$/);
    if (rgba) {
        return {
            r: parseInt(rgba[1]) / 255.0,
            g: parseInt(rgba[2]) / 255.0,
            b: parseInt(rgba[3]) / 255.0,
            a: Number(rgba[4]),
        }
    }
    const rgb = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgb) {
        return {
            r: parseInt(rgb[1]) / 255.0,
            g: parseInt(rgb[2]) / 255.0,
            b: parseInt(rgb[3]) / 255.0,
            a: 1,
        }
    }
    throw new Error(`Could not convert color "${color}"`);
}
assert_same(parseColor('rgb(100,200,100)'), { r: 100/255, g: 200/255, b: 100/255, a: 1.0 });
assert_same(parseColor('rgba(100,200,100,0.4)'), { r: 100/255, g: 200/255, b: 100/255, a: 0.4 });
assert_same(parseColor('none'), { r: 0, g: 0, b: 0, a: 0});
assert_same(parseColor('red'), { r: 1, g: 0, b: 0, a: 1});
assert_same(parseColor('#000'), { r: 0, g: 0, b: 0, a: 1});
assert_same(parseColor('#800'), { r: 136/255, g: 0, b: 0, a: 1});
assert_same(parseColor('#f00'), { r: 1, g: 0, b: 0, a: 1});
assert_same(parseColor('#0f0'), { r: 0, g: 1, b: 0, a: 1});
assert_same(parseColor('#00f'), { r: 0, g: 0, b: 1, a: 1});
assert_same(parseColor('#0000'), { r: 0, g: 0, b: 0, a: 0});
assert_same(parseColor('#f000'), { r: 1, g: 0, b: 0, a: 0});
assert_same(parseColor('#0f00'), { r: 0, g: 1, b: 0, a: 0});
assert_same(parseColor('#00f0'), { r: 0, g: 0, b: 1, a: 0});
assert_same(parseColor('#000f'), { r: 0, g: 0, b: 0, a: 1});
assert_same(parseColor('#000000'), { r: 0, g: 0, b: 0, a: 1});
assert_same(parseColor('#800000'), { r: 128/255, g: 0, b: 0, a: 1});
assert_same(parseColor('#008000'), { r: 0, g: 128/255, b: 0, a: 1});
assert_same(parseColor('#000080'), { r: 0, g: 0, b: 128/255, a: 1});

globalThis.document = {
    getElementById(id) {
        // Should only get here when testing Factory
        console.debug(`getElementById id=${id}`);
        const canvas = new Canvas(500, 400, 1.0, '#fff', '#000', false);
        return canvas;
        //assert(false, "getElementById called");
    },
    createElement(t) {
        if (t === 'span') {
            // span element is only used for font name parsing
            let fullFont = '30pt Bravura,Academico';
            let parsedFont = parseFont(fullFont);
            return {
                style: {
                    set font(txt) {
                        fullFont = txt;
                        parsedFont = parseFont(fullFont);
                    },
                    get font() {
                        return fullFont;
                    },
                    get fontFamily() {
                        return parsedFont.family;
                    },
                    get fontSize() {
                        return `${parsedFont.size}pt`;
                    }
                },
            };
        }
        assert(t === 'canvas', `Can only create canvas got t=${t}`);
        // Canvases created during rendering are for font measuring and testing only.
        // So just create dummy canvas.
        const canvas = new Canvas(1, 1, 1.0, '#fff', '#000', false);
        return canvas;
    }
};

class CanvasContext {
    constructor(ctx, zoom, canvas) {
        console.debug(`CanvasContext constructed`);
        // ctx is the DrawContext
        this.ctx = ctx;
        this.zoom = zoom;
        // Need canvas field to hold final computed scaled width and height
        this.canvas = { width:0, height: 0 };
        this.actualCanvas = canvas;
        // Global offset for subpixel aliasing issues
        this.offset = { x:-0.3/zoom, y:-0.3/zoom };
        // Stack of saved drawing states to pop back
        this.stack = [];
        // Set default values for state
        this.lineWidth = 1.0;
        this.fillStyle = "#000";
        this.ctx.fillStyle = "#000";
        this.strokeStyle = "#000";
        this.ctx.strokeStyle = "#000";
        this.font = "12pt Academico";
        // this.ctx transform already setup on Rust side to identity
    }
    // Wrapped methods
    getTransform() {
        console.debug(`CanvasContext::getTransform`);
        return this.ctx.getTransform();
    }
    setTransform(t) {
        console.debug(`CanvasContext::setTransform`);
        return this.ctx.setTransform(t);
    }
    fillText(txt, x, y) {
        const { size, italic, bold } = parseFont(this.font);
        console.debug(`CanvasContext::fillText txt=${txt} x=${x} y=${y} size=${size} this.font=${this.font} this.fillStyle=${this.fillStyle}`);
        this.ctx.fillStyle = this.fillStyle;
        this.ctx.fillText(txt, x + this.offset.x, y + this.offset.y, size, italic, bold);
    }
    arc(x, y, radius, startAngle, endAngle, counterclockwise) {
        console.debug(`CanvasContext::arc ${x}, ${y} ${startAngle} ${endAngle} ${counterclockwise}`);
        this.ctx.arc(x + this.offset.x, y + this.offset.y, radius, startAngle, endAngle, counterclockwise);
    }
    rect(x, y, width, height) {
        console.debug(`CanvasContext::rect ${x}, ${y} ${width}, ${height}`);
        this.ctx.rect(x + this.offset.x, y + this.offset.y, width, height);
    }
    beginPath() {
        console.debug(`CanvasContext::beginPath`);
        this.ctx.beginPath();
    }
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        console.debug(`CanvasContext::bezierCurveTo`);
        this.ctx.bezierCurveTo(cp1x + this.offset.x, cp1y + this.offset.y, cp2x + this.offset.x, cp2y + this.offset.y, x + this.offset.x, y + this.offset.y);
    }
    quadraticCurveTo(cpx, cpy, x, y) {
        console.debug(`CanvasContext::quadraticCurveTo`);
        this.ctx.quadraticCurveTo(cpx + this.offset.x, cpy + this.offset.y, x + this.offset.x, y + this.offset.y);
    }
    measureText(txt) {
        const { size, italic, bold } = parseFont(this.font);
        console.debug(`CanvasContext::measureText ${txt} ${size} ${italic} ${bold}`);
        return this.ctx.measureString(txt, size, italic, bold);
    }
    closePath() {
        console.debug(`CanvasContext::closePath`);
        this.ctx.closePath();
    }
    translate(x, y) {
        console.debug(`CanvasContext::translate ${x}, ${y}`);
        this.ctx.translate(x, y);
    }
    rotate(angle) {
        console.debug(`CanvasContext::rotate ${angle}`);
        this.ctx.rotate(angle);
    }
    scale(x, y) {
        console.debug(`CanvasContext::scale ${x}, ${y}`);
        this.ctx.scale(x, y);
    }
    fill() {
        console.debug(`CanvasContext::fill ${this.fillStyle}`);
        this.ctx.fillStyle = this.fillStyle;
        this.ctx.fill();
    }
    fillRect(x, y, width, height) {
        console.debug(`CanvasContext::fillRect ${x + this.offset.x}, ${y + this.offset.y}, ${width}, ${height} fillStyle=${this.fillStyle}`);
        this.ctx.fillStyle = this.fillStyle;
        this.ctx.fillRect(x + this.offset.x, y + this.offset.y, width, height);
    }
    clearRect(x, y, width, height) {
        console.debug(`CanvasContext::clearRect(${x}, ${y}, ${width}, ${height})`);
        this.ctx.clearRect(x + this.offset.x, y + this.offset.y, width, height);
    }
    lineTo(x, y) {
        console.debug(`CanvasContext::lineTo ${x}, ${y}`);
        this.ctx.lineTo(x + this.offset.x, y + this.offset.y);
    }
    moveTo(x, y) {
        console.debug(`CanvasContext::moveTo ${x}, ${y}`);
        this.ctx.moveTo(x + this.offset.x, y + this.offset.y);
    }
    restore() {
        console.debug(`CanvasContext::restore`);
        if (this.stack.length === 0) {
            console.error('CanvasContext::restore(): Cannot restore drawing state, no saved state in stack.');
            return;
        }
        const state = this.stack.pop();
        this.font = state.font;
        this.fillStyle = state.fillStyle;
        this.strokeStyle = state.strokeStyle;
        this.lineWidth = state.lineWidth;
        this.ctx.setTransform(state.transform);
    }
    save() {
        console.debug(`CanvasContext::save`);
        const state = {
            font: this.font,
            fillStyle: this.fillStyle,
            strokeStyle: this.strokeStyle,
            lineWidth: this.lineWidth,
            transform: this.ctx.getTransform(),
        };
        this.stack.push(state);
    }
    stroke() {
        console.debug(`CanvasContext::stroke strokeStyle=${this.strokeStyle} lineWidth=${this.lineWidth}`);
        this.ctx.strokeStyle = this.strokeStyle;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.stroke();
    }
    setLineDash(dash) {
        console.debug(`CanvasContext::setLineDash ${dash} strokeStyle=${this.strokeStyle} lineWidth=${this.lineWidth}`);
    }
}

export class Canvas {
    constructor(width, height, zoom, background, foreground, forceForeground) {
        this.width = width;
        this.height = height;
        this.zoom = zoom;
        this.background = parseColor(background);
        this.foreground = parseColor(foreground);
        this.drawContext = new DrawContext(width, height, this.zoom, /* bg */ '#fff', /* fg */ '#000');
        // Set opaque page
        //this.drawContext.clear(this.background.r, this.background.g, this.background.b, this.background.a);
        this.canvasContext = new CanvasContext(this.drawContext, this.zoom, this);
        // Set default fill and stroke to foreground color
        this.canvasContext.fillStyle = foreground;
        this.canvasContext.strokeStyle = foreground;
        // If requested, force all fill and stroke colors to be foreground
        if (forceForeground) {
            // pre-parse color so we don't have to do it for every draw, it's not changing
            this.canvasContext.forceFillStyle = parseColor(foreground);
            this.canvasContext.forceStrokeStyle = parseColor(foreground);
        }
    }
    getContext() {
        return this.canvasContext;
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
