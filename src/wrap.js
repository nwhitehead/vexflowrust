
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

globalThis.assert = function(condition, msg) {
    if (!condition) {
        throw new Error("Assertion failed: " + msg);
    }
}

// Need to have window object so that we get window.VexFlow
// Should not need any methods (setTimeout etc.)
globalThis.window = {};

/// Parse full fontname like "30pt Bravura,Academico" into { font: 'Bravura', size: 30 }
function parseFont(fontname) {
    if (fontname === undefined) {
        return null;
    }
    const parts = fontname.split(',');
    const part = parts[0];
    const match = part.match(/^(\d+)pt (.*)/);
    if (match) {
        return {
            font: match[2],
            size: Number(match[1]),
        }
    }
    return null;
}

globalThis.document = {
    getElementById(id) {
        // Should never get here
        assert(false, "getElementById called");
    },
    createElement(t) {
        if (t === 'span') {
            // span element is only used for font name parsing
            let fullFont = '30pt Bravura,Academico';
            return {
                style: {
                    set font(txt) {
                        fullFont = txt;
                    },
                    get font() {
                        return parseFont(fullFont);
                    },
                },
            };
        }
        assert(t === 'canvas', `Can only create canvas got t=${t}`);
        // Canvases created during rendering are for font measuring only.
        return {
            getContext(t) {
                return {
                    measureText(txt) {
                        const { font, size } = parseFont(this.font);
                        const scale = cpp_get_font_scale(font, size) * globalFontScale;
                        let res = cpp_measure_text(txt.codePointAt(0) || 0, font, scale);
                        return res;
                    }
                };
            }
        };
    }
};

export default {};
