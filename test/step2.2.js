const { Stave, StaveNote, Voice, Formatter } = VF;

const stave = new Stave(10, 40, 400);
stave.addClef("treble").addTimeSignature("4/4");
stave.setContext(context).draw();

// Create the notes
const notes = [
    // A quarter-note C.
    new StaveNote({ keys: ["c/5"], duration: "q" }),

    // A quarter-note D.
    new StaveNote({ keys: ["d/4"], duration: "q" }),

    // A quarter-note rest. Note that the key (b/4) specifies the vertical
    // position of the rest.
    new StaveNote({ keys: ["b/4"], duration: "qr" }),

    // A C-Major chord.
    new StaveNote({ keys: ["c/4", "e/4", "g/4"], duration: "q" }),
];

const notes2 = [
    new StaveNote({
        keys: ["c/4"],
        duration: "w",
    }),
];

// Create a voice in 4/4 and add above notes
const voices = [
    new Voice({
        num_beats: 4,
        beat_value: 4,
    }).addTickables(notes),
    new Voice({
        num_beats: 4,
        beat_value: 4,
    }).addTickables(notes2),
];

// Format and justify the notes to 400 pixels.
new Formatter().joinVoices(voices).format(voices, 350);

// Render voices.
voices.forEach(function (v) {
    v.draw(context, stave);
});
