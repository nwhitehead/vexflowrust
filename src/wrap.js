
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

globalThis.document = {
    getElementById(id) {
        // Should only get here when testing Factory
        console.debug(`getElementById id=${id}`);
        const canvas = new Canvas(500, 400, 1.0, '#fff', '#000', false);
        return canvas;
    },
    createElement(t) {
        if (t === 'span') {
            console.debug(`createElement('span')`);
            // span element is only used for font name parsing
            return {
                style: new SpanFontParser(),
            };
        }
        if (t === 'canvas') {
            console.debug(`createElement('canvas')`);
            // Canvases created during rendering are for font measuring and testing only.
            // So just create dummy canvas.
            const canvas = new Canvas(1, 1, 1.0, '#fff', '#000', false);
            return canvas;
        }
        throw new Error(`Cannot create element '${t}', not supported`);
    }
};

export class Canvas {
    constructor(width, height, zoom, background, foreground, forceForeground) {
        this.width = width;
        this.height = height;
        this.zoom = zoom;
        this.drawContext = new DrawContext(width, height, this.zoom, background, foreground);
        this.drawContext.canvas = { width: 0, height: 0 }
    }
    getContext() {
        return this.drawContext;
        //return this.canvasContext;
    }
    // Need to have toDataURL for type detection to pass
    toDataURL() {
        return "<URL>";
    }
}



export default {};
