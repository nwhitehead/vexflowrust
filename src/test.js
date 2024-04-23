
globalThis.console = {
    log(txt) {
        print(txt.toString());
    },
    warn(txt) {
        print(txt.toString());
    },
    error(txt) {
        print(txt.toString());
    }
};

const word = 'world';
console.log(`Hello, ${word}!`);

// globalThis.console = {
//     log(msg): { print(msg.toString()); },
// };
const c = new Canvas(100, 100);
console.log(c.toDataURL());
