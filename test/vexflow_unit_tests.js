import { VexFlowTests } from '../../vexflow/tests/vexflow_test_helpers.js';

// import * as _ from '../../vexflow/tests/index.js';
import * as _ from '../../vexflow/tests/annotation_tests.js';


console.log(`Running ${VexFlowTests.tests.length} tests`);

VexFlowTests.run();
