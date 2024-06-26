const { Dot } = VF;

const system = vf.System({ width: 400 });

function dotted(staveNote, noteIndex = -1) {
    if (noteIndex < 0) {
        Dot.buildAndAttach([staveNote], {
            all: true,
        });
    } else {
        Dot.buildAndAttach([staveNote], {
            index: noteIndex,
        });
    }
    return staveNote;
}

const notes = [
    dotted(vf.StaveNote({
        keys: ['e##/5'],
        duration: '8d',
    }).addModifier(vf.Accidental({ type: '##' }))),

    vf.StaveNote({
        keys: ['eb/5'],
        duration: '16',
    }).addModifier(vf.Accidental({ type: 'b' })),

    dotted(vf.StaveNote({
        keys: ['eb/4', 'd/5'],
        duration: 'h',
    }), 0 /* add dot to note at index==0 */),

    dotted(vf.StaveNote({
        keys: ['c/5', 'eb/5', 'g#/5'],
        duration: 'q',
    })
    .addModifier(vf.Accidental({ type: 'b' }), 1)
    .addModifier(vf.Accidental({ type: '#' }), 2)),
];

vf.TextBracket({
    from: notes[0],
    to: notes[2],
    text: '8',
    options: {
        superscript: 'vb',
        position: 'bottom',
        line: 3,
    },
});

const voice = vf.Voice().addTickables(notes);

system
    .addStave({
        voices: [voice],
    })
    .addClef('treble')
    .addTimeSignature('4/4');

vf.draw();
