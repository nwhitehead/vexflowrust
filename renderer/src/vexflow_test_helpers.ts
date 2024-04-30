// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// VexFlow Test Support Library

// This file is heavily modified from original VexFlow file: tests/vexflow_test_helpers.ts

import { ContextBuilder, Element, Factory, RenderContext, Renderer } from '../src/index';

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
      const canvas = new Canvas(width, height, zoom, background, foreground, /*forceForeground=*/false);
      this.canvas = canvas;
      const context = Renderer.buildContext(canvas, 1/*canvas backend*/, width, height, background);
      this.context = context;
  }
  saveFile(filename) {
      this.canvas.saveFile(filename);
  }
}

function rustContextBuilder(elementId: string, width: number, height: number, background: string): ContextBuilder {
  const headlessFactory = new HeadlessFactory({width, height, background});
  return headlessFactory.context;
}

// eslint-disable-next-line
declare const $: any;

const global = globalObject();

export interface TestOptions {
  elementId: string;
  params: any /* eslint-disable-line */;
  assert: Assert;
  backend: number;

  // Some tests use this field to pass around the ContextBuilder function.
  contextBuilder?: ContextBuilder;
}

export type TestFunction = (options: TestOptions, contextBuilder: ContextBuilder) => void;

export type RunOptions = {
  jobs: number;
  job: number;
};

/**
 * Clean the input string so we can use it inside file names.
 * Only allow alphanumeric characters and underscores.
 * Replace other characters with underscores.
 */
function sanitize(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, '_');
}

interface Test {
  Start(): void;
}

export class VexFlowTests {
  static tests: Test[] = [];

  // Call this at the end of a `tests/xxxx_tests.ts` file to register the module.
  static register(test: Test): void {
    VexFlowTests.tests.push(test);
  }

  static parseJobOptions(runOptions?: RunOptions): RunOptions {
    let { jobs, job } = runOptions || { jobs: 1, job: 0 };
    return {
      jobs,
      job,
    };
  }

  // flow.html calls this to invoke all the tests.
  static run(runOptions?: RunOptions): void {
    const { jobs, job } = VexFlowTests.parseJobOptions(runOptions);
    VexFlowTests.tests.forEach((test, idx: number) => {
      if (jobs === 1 || idx % jobs === job) {
        test.Start();
      }
    });
  }

  // See: generate_images_jsdom.js
  // Provides access to Node JS fs & process.
  // eslint-disable-next-line
  static shims: any;

  // Default font properties for tests.
  static Font = { size: 10 };

  private static NEXT_TEST_ID = 0;

  /** Return a unique ID for a test. */
  static generateTestID(prefix: string): string {
    return prefix + '_' + VexFlowTests.NEXT_TEST_ID++;
  }

  /**
   * Run `func` inside a QUnit test for each of the enabled rendering backends.
   * @param name
   * @param testFunc
   * @param params
   */
  // eslint-disable-next-line
  static runTests(name: string, testFunc: TestFunction, params?: any): void {
    if (QUnit.moduleName === 'Renderer') {
      console.warn(`Skipped Renderer tests`);
      return;
    }
    VexFlowTests.runRustTest(name, testFunc, params);
  }

  // eslint-disable-next-line
  static runTextTests(name: string, testFunc: TestFunction, params?: any): void {
  }

  static makeFactory(options: TestOptions, width: number = 450, height: number = 140): Factory {
    return new HeadlessFactory({ width, height, id: options.elementId });
  }

  // eslint-disable-next-line
  static runRustTest(name: string, testFunc: TestFunction, params: any): void {
    const helper = VexFlowTests.runRustTestHelper;
    VexFlowTests.runWithParams({ testType: 'RustBackend', name, testFunc, params, helper });
  }

  static runSVGTest(): void {};

  /**
   * Save the PNG file.
   * @param fontName
   * @param element
   */
  static runRustTestHelper(): void {
    if (Renderer.lastContext !== undefined) {
      const fileName =
        'build/images/current/rust_' +
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
  static runWithParams({ testFunc, name, params, backend, tagName, testType, helper }: any): void {
    if (name === undefined) {
      throw new Error('Test name is undefined.');
    }
    const testTypeLowerCase = testType.toLowerCase();
    // eslint-disable-next-line
    QUnit.test(name, (assert: any) => {
      const elementId = VexFlowTests.generateTestID(`${testTypeLowerCase}`);
      const options: TestOptions = { elementId, params, assert, backend };
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
  static plotLegendForNoteWidth(ctx: RenderContext, x: number, y: number): void {
    ctx.save();
    ctx.setFont('Academico', 8);

    const spacing = 12;
    let lastY = y;

    function legend(color: string, text: string) {
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

  static drawBoundingBox(ctx: RenderContext, el: Element) {
    const bb = el.getBoundingBox();
    ctx.beginPath();
    ctx.rect(bb.getX(), bb.getY(), bb.getW(), bb.getH());
    ctx.stroke();
  }
}

/**
 * Used with array.reduce(...) to flatten arrays of arrays in the tests.
 */
// eslint-disable-next-line
export const concat = (a: any[], b: any[]): any[] => a.concat(b);

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
