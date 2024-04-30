const { Accidental, Beam, Dot, Stave, StaveNote, Voice, Formatter } = VF;

const stave = new Stave(10, 40, 400);
stave.addClef("treble").addTimeSignature("4/4");
stave.setContext(context).draw();


const notes1 = [
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
];

const notes2 = [
    new StaveNote({
        keys: ["c/4"],
        duration: "8",
    }),
    new StaveNote({
        keys: ["d/4"],
        duration: "16",
    }),
    new StaveNote({
        keys: ["e/4"],
        duration: "16",
    }).addModifier(new Accidental("b")),
];

const notes3 = [
    new StaveNote({
        keys: ["d/4"],
        duration: "16",
    }),
    new StaveNote({
        keys: ["e/4"],
        duration: "16",
    }).addModifier(new Accidental("#")),
    new StaveNote({
        keys: ["g/4"],
        duration: "32",
    }),
    new StaveNote({
        keys: ["a/4"],
        duration: "32",
    }),
    new StaveNote({
        keys: ["g/4"],
        duration: "16",
    }),
];

const notes4 = [
    new StaveNote({
        keys: ["d/4"],
        duration: "q",
    }),
];

const allNotes = notes1.concat(notes2).concat(notes3).concat(notes4);

// Create the beams for the first three groups.
// This hides the normal stems and flags.
const beams = [new Beam(notes1), new Beam(notes2), new Beam(notes3)];

Formatter.FormatAndDraw(context, stave, allNotes);

// Draw the beams and stems.
beams.forEach((b) => {
    b.setContext(context).draw();
});

// Helper function.
function dotted(staveNote) {
    Dot.buildAndAttach([staveNote]);
    return staveNote;
}
