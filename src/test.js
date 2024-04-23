
function anyToString(v) {
    if (v === undefined) {
        return 'undefined';
    }
    if (v === null) {
        return 'null';
    }
    return v.toString();
}
globalThis.console = {
    log(txt) {
        print(anyToString(txt));
    },
    warn(txt) {
        print(anyToString(txt));
    },
    error(txt) {
        print(anyToString(txt));
    }
};

const word = 'world';
console.log(`Hello, ${word}!`);

// globalThis.console = {
//     log(msg): { print(msg.toString()); },
// };
const c = new DrawContext(100, 100);
c.font = '30pt Bravura';
console.log(c.font);
