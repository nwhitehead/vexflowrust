import _ from './src/wrap.js';

export async function main() {
    console.log(`arg=${arg}`);
    await import(arg);
}

main().catch((err) => {
    // Need to catch exceptions here, at Rust QuickJS scope we just see pending jobs and don't get the exceptions.
    // Luckily they do have stack traces.
    console.error(`Uncaught exception: ${err}\n${err.stack}`);
});
