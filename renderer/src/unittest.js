import _ from 'wrap';

import { VexFlowTests } from 'vexflow_test_helpers';
import * as __ from './vexflow/build/esm/tests/index.js';

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
