// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// VexFlow Test Support Library
// This file is heavily modified from original VexFlow file: tests/vexflow_test_helpers.ts
import { Factory, Renderer } from '../src/index';
import { Metrics } from '../src/metrics';
import { globalObject } from '../src/util';
import { Canvas } from "wrap";
export class HeadlessFactory extends Factory {
    constructor(options) {
        const opts = options || {};
        const width = opts.width || 500;
        const height = opts.height || 200;
        super({ renderer: { elementId: null, width, height } });
        const zoom = opts.zoom || 1.0;
        const background = opts.background || '#00000000'; // Nice paper: '#fff5f0ff';
        const foreground = opts.foreground || '#111';
        const canvas = new Canvas(width, height, zoom, background, foreground, /*forceForeground=*/ false);
        this.canvas = canvas;
        const context = Renderer.buildContext(canvas, 1 /*canvas backend*/, width, height, background);
        this.context = context;
    }
    saveFile(filename) {
        this.canvas.saveFile(filename);
    }
}
function rustContextBuilder(elementId, width, height, background) {
    const headlessFactory = new HeadlessFactory({ width, height, background });
    return headlessFactory.context;
}
const global = globalObject();
/**
 * Clean the input string so we can use it inside file names.
 * Only allow alphanumeric characters and underscores.
 * Replace other characters with underscores.
 */
function sanitize(text) {
    return text.replace(/[^a-zA-Z0-9]/g, '_');
}
export class VexFlowTests {
    // Call this at the end of a `tests/xxxx_tests.ts` file to register the module.
    static register(test) {
        VexFlowTests.tests.push(test);
    }
    static parseJobOptions(runOptions) {
        let { jobs, job } = runOptions || { jobs: 1, job: 0 };
        return {
            jobs,
            job,
        };
    }
    // flow.html calls this to invoke all the tests.
    static run(runOptions) {
        const { jobs, job } = VexFlowTests.parseJobOptions(runOptions);
        VexFlowTests.tests.forEach((test, idx) => {
            if (jobs === 1 || idx % jobs === job) {
                test.Start();
            }
        });
    }
    /** Return a unique ID for a test. */
    static generateTestID(prefix) {
        return prefix + '_' + VexFlowTests.NEXT_TEST_ID++;
    }
    /**
     * Run `func` inside a QUnit test for each of the enabled rendering backends.
     * @param name
     * @param testFunc
     * @param params
     */
    // eslint-disable-next-line
    static runTests(name, testFunc, params) {
        if (QUnit.moduleName === 'Renderer') {
            console.warn(`Skipped Renderer tests`);
            return;
        }
        VexFlowTests.runRustTest(name, testFunc, params);
    }
    // eslint-disable-next-line
    static runTextTests(name, testFunc, params) {
    }
    static makeFactory(options, width = 450, height = 140) {
        return new HeadlessFactory({ width, height, id: options.elementId });
    }
    // eslint-disable-next-line
    static runRustTest(name, testFunc, params) {
        const helper = VexFlowTests.runRustTestHelper;
        VexFlowTests.runWithParams({ testType: 'RustBackend', name, testFunc, params, helper });
    }
    static runSVGTest() { }
    ;
    /**
     * Save the PNG file.
     * @param fontName
     * @param element
     */
    static runRustTestHelper() {
        if (Renderer.lastContext !== undefined) {
            const fileName = 'images/rust_' +
                // eslint-disable-next-line
                // @ts-ignore
                sanitize(QUnit.moduleName) +
                '.' +
                // eslint-disable-next-line
                // @ts-ignore
                sanitize(QUnit.testName) +
                '.Bravura.png';
            // Save image
            Renderer.lastContext.context2D.savePng(fileName);
        }
    }
    /** Run QUnit.test(...) for each font. */
    // eslint-disable-next-line
    static runWithParams({ testFunc, name, params, backend, tagName, testType, helper }) {
        if (name === undefined) {
            throw new Error('Test name is undefined.');
        }
        const testTypeLowerCase = testType.toLowerCase();
        // eslint-disable-next-line
        QUnit.test(name, (assert) => {
            const elementId = VexFlowTests.generateTestID(`${testTypeLowerCase}`);
            const options = { elementId, params, assert, backend };
            testFunc(options, rustContextBuilder);
            if (helper) {
                helper();
            }
        });
    }
    /**
     * @param ctx
     * @param x
     * @param y
     */
    static plotLegendForNoteWidth(ctx, x, y) {
        ctx.save();
        ctx.setFont(Metrics.get('fontFamily'), 8);
        const spacing = 12;
        let lastY = y;
        function legend(color, text) {
            ctx.beginPath();
            ctx.setStrokeStyle(color);
            ctx.setFillStyle(color);
            ctx.setLineWidth(10);
            ctx.moveTo(x, lastY - 4);
            ctx.lineTo(x + 10, lastY - 4);
            ctx.stroke();
            ctx.setFillStyle('black');
            ctx.fillText(text, x + 15, lastY);
            lastY += spacing;
        }
        legend('green', 'Note + Flag');
        legend('red', 'Modifiers');
        legend('#999', 'Displaced Head');
        legend('#DDD', 'Formatter Shift');
        ctx.restore();
    }
    static drawBoundingBox(ctx, el) {
        const bb = el.getBoundingBox();
        ctx.beginPath();
        ctx.rect(bb.getX(), bb.getY(), bb.getW(), bb.getH());
        ctx.stroke();
    }
}
VexFlowTests.tests = [];
// Default font properties for tests.
VexFlowTests.Font = { size: 10 };
VexFlowTests.NEXT_TEST_ID = 0;
/**
 * Used with array.reduce(...) to flatten arrays of arrays in the tests.
 */
// eslint-disable-next-line
export const concat = (a, b) => a.concat(b);
/** Used in KeySignature and ClefKeySignature Tests. */
export const MAJOR_KEYS = [
    //
    'C',
    'F',
    'Bb',
    'Eb',
    'Ab',
    'Db',
    'Gb',
    'Cb',
    'G',
    'D',
    'A',
    'E',
    'B',
    'F#',
    'C#',
];
export const MINOR_KEYS = [
    'Am',
    'Dm',
    'Gm',
    'Cm',
    'Fm',
    'Bbm',
    'Ebm',
    'Abm',
    'Em',
    'Bm',
    'F#m',
    'C#m',
    'G#m',
    'D#m',
    'A#m',
];
