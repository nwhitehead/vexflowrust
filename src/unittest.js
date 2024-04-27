import _ from './src/wrap.js';

import { VexFlowTests } from '../vexflow/tests/vexflow_test_helpers.js';
import * as __ from '../vexflow/tests/index.js';

export async function main() {
    console.log(`Running ${VexFlowTests.tests.length} tests`);
    VexFlowTests.run();
}

main().catch((err) => {
    // Need to catch exceptions here, at Rust QuickJS scope we just see pending jobs and don't get the exceptions.
    // Luckily they do have stack traces.
    console.error(`Uncaught exception: ${err}\n${err.stack}`);
});
