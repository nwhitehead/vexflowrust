import _ from '@wrap';

async function main() {
    // Load and register all tests dynamically
    // Make sure to await it, otherwise we will just run 0 tests
    // It is a dynamic import because location depends on command line argument
    //const importPath = path_join(arg[0], "tests_bundle.js");
    const importPath = "./build/vexflow-debug-with-tests.js";
    console.log(`Loading script from ${importPath}`);
    const { VexFlow } = await import(importPath);
    console.log(`Running tests`);
    VexFlow.Test.run();
    console.log(`test result: \x1b[1m${QUnit.passed}\x1b[0m tests passed.`);
}

try {
    await main();
} catch(err) {
    console.error(`Uncaught exception: ${err}\n${err.stack}`);
}
