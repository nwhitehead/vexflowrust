import _ from 'wrap';

import { VexFlowTests } from 'vexflow_test_helpers';

async function main() {
    // Load and register all tests dynamically
    // Make sure to await it, otherwise we will just run 0 tests
    // It is a dynamic import because location depends on command line argument
    const __ = await import(path_join(arg[0], "build/esm/tests/index.js"));
    console.log(`Running tests`);
    VexFlowTests.run();
    console.log(`test result: \x1b[1m${QUnit.passed}\x1b[0m tests passed.`);
}

try {
    await main();
} catch(err) {
    console.error(`Uncaught exception: ${err}\n${err.stack}`);
}
