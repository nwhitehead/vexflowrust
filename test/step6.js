const { Accidental, TabStave, TabNote, Bend, Vibrato, Beam, Dot, Stave, StaveNote, StaveTie, Voice, Formatter } = VF;

const stave = new TabStave(10, 40, 400);
stave.addClef("tab").setContext(context).draw();

const notes = [
    // A single note
    new TabNote({
        positions: [{ str: 3, fret: 7 }],
        duration: "q",
    }),

    // A chord with the note on the 3rd string bent
    new TabNote({
        positions: [
            { str: 2, fret: 10 },
            { str: 3, fret: 9 },
        ],
        duration: "q",
    }),//.addModifier(new Bend("Full"), 1),

    // A single note with a harsh vibrato
    new TabNote({
        positions: [{ str: 2, fret: 5 }],
        duration: "h",
    }).addModifier(new Vibrato().setVibratoWidth(70), 0),
];

Formatter.FormatAndDraw(context, stave, notes);
