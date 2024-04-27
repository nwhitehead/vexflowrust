import _ from './src/wrap.js';

import { VexFlowTests } from '../vexflow/tests/vexflow_test_helpers.js';
import * as __ from '../vexflow/tests/index.js';

async function main() {
    console.log(`Running ${VexFlowTests.tests.length} tests`);
    VexFlowTests.run();
}

await main();
