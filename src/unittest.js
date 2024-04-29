import _ from './src/wrap.js';

import { VexFlowTests } from '../vexflow/tests/vexflow_test_helpers.js';
import * as __ from '../vexflow/tests/index.js';
//import * as __ from '../vexflow/tests/dot_tests.js';

async function main() {
    console.log(`Running tests`);
    VexFlowTests.run();
    console.log(`test result: \x1b[1m${QUnit.passed}\x1b[0m tests passed.`);
}

try {
    await main();
} catch(err) {
    console.error(`Uncaught exception: ${err}\n${err.stack}`);
}
