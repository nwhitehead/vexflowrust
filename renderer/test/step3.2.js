const { Accidental, Beam, Dot, Stave, StaveNote, Voice, Formatter } = VF;

const stave = new Stave(10, 40, 400);
stave.addClef("treble").addTimeSignature("4/4");
stave.setContext(context).draw();

const notes = [
    new StaveNote({ keys: ["g/4", "b/4", "cb/5", "e/5", "g#/5", "b/5"], duration: "h" })
        .addModifier(new Accidental("bb"), 0)
        .addModifier(new Accidental("b"), 1)
        .addModifier(new Accidental("#"), 2)
        .addModifier(new Accidental("n"), 3)
        .addModifier(new Accidental("b"), 4)
        .addModifier(new Accidental("##"), 5),
    new StaveNote({ keys: ["c/4"], duration: "h" }),
];

Formatter.FormatAndDraw(context, stave, notes);
