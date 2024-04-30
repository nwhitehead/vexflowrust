const { Accidental, Beam, Dot, Stave, StaveNote, StaveTie, Voice, Formatter } = VF;

const stave = new Stave(10, 40, 400);
stave.addClef("treble").addTimeSignature("4/4");
stave.setContext(context).draw();

const notes = [
    dotted(
        new StaveNote({
            keys: ["e##/5"],
            duration: "8d",
        }).addModifier(new Accidental("##"))
    ),
    new StaveNote({
        keys: ["b/4"],
        duration: "16",
    }).addModifier(new Accidental("b")),
    new StaveNote({
        keys: ["c/4"],
        duration: "8",
    }),
    new StaveNote({
        keys: ["d/4"],
        duration: "16",
    }),
    new StaveNote({
        keys: ["d/4"],
        duration: "16",
    }),
    new StaveNote({
        keys: ["d/4"],
        duration: "q",
    }),
    new StaveNote({
        keys: ["d/4"],
        duration: "q",
    }),
];

const beams = Beam.generateBeams(notes);
Formatter.FormatAndDraw(context, stave, notes);
beams.forEach(function (b) {
    b.setContext(context).draw();
});

const ties = [
    new StaveTie({
        firstNote: notes[4],
        lastNote: notes[5],
        firstIndices: [0],
        lastIndices: [0],
    }),
    new StaveTie({
        firstNote: notes[5],
        lastNote: notes[6],
        firstIndices: [0],
        lastIndices: [0],
    }),
];

ties.forEach((t) => {
    t.setContext(context).draw();
});

// A helper function to add a dot to a note.
function dotted(note) {
    Dot.buildAndAttach([note]);
    return note;
}