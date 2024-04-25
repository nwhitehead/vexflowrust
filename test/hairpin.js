const { Accidental, Beam, Dot, Stave, StaveHairpin, StaveNote, StaveTie, System, Voice, Formatter } = VF;

const system = new System({ width: 400 });
const system2 = new System({ x: 400, width: 350 });

const notes = [
    new StaveNote({
        keys: ['e/5'],
        duration: 'q',
    }),
    new StaveNote({
        keys: ['e/4', 'd/5'],
        duration: 'h',
    }),
    new StaveNote({
        keys: ['c/5', 'e/5', 'g/5'],
        duration: 'q',
    }),
];

const notes2 = [
    new StaveNote({
        keys: ['e/5'],
        duration: 'q',
    }),
    new StaveNote({
        keys: ['e/4', 'd/5'],
        duration: 'h',
    }),
    new StaveNote({
        keys: ['c/5', 'e/5', 'g/5'],
        duration: 'q',
    }),
];

const voice = new Voice().addTickables(notes);
const voice2 = new Voice().addTickables(notes2);

system
    .addStave({
        voices: [voice],
    })
    .addClef('treble')
    .addTimeSignature('4/4');

system2
    .addStave({
        voices: [voice2],
    });

Formatter.FormatAndDraw(context, stave, notes);

vf.draw();

const hairpin = new StaveHairpin({ firstNote: notes[1], lastNote: notes2[1] }, 2);
hairpin.setContext(context);
hairpin.setPosition(4);
hairpin.draw();
