import _ from '@wrap';
import { VexFlow } from "@vexflow-debug-with-tests";

async function main() {
    console.log(`Running tests`);
    VexFlow.Test.run();
    console.log(`test result: \x1b[1m${QUnit.passed}\x1b[0m tests passed.`);
}

try {
    await main();
} catch(err) {
    console.error(`Uncaught exception: ${err}\n${err.stack}`);
}
