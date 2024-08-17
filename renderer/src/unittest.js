// Use dynamic import to be able to catch exceptions during import.
// Otherwise we don't see anything on broken imports.
try {
    await import('@wrap');
    //let { VexFlow } = await import('@vexflow-debug-with-tests');
    let m = await import('@osmd');

    async function main() {
        console.log(`Running tests`);
        console.log(m);
        // VexFlow.Test.run();
        // console.log(`test result: \x1b[1m${QUnit.passed}\x1b[0m tests passed.`);
    }
    await main();
} catch(err) {
    console.error(`Uncaught exception: ${err}\n${err.stack}`);
    panic(`${err}`);
}
