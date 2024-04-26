import { VexFlowTests } from '../../vexflow/tests/vexflow_test_helpers.js';
import { AccidentalTests } from '../../vexflow/tests/accidental_tests.js';

console.log(`Running ${VexFlowTests.tests.length} tests`);

VexFlowTests.run();
