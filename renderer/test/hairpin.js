const { Accidental, Beam, Dot, Stave, StaveHairpin, StaveNote, StaveTie, System, Voice, Formatter } = VF;

const system = vf.System({ width: 400 });
const system2 = vf.System({ x: 400, width: 350 });

const notes = [
  vf.StaveNote({
    keys: ['e/5'],
    duration: 'q',
  }),

  vf.StaveNote({
    keys: ['e/4', 'd/5'],
    duration: 'h',
  }),

  vf.StaveNote({
    keys: ['c/5', 'e/5', 'g/5'],
    duration: 'q',
  }),
];

const notes2 = [
  vf.StaveNote({
    keys: ['e/5'],
    duration: 'q',
  }),

  vf.StaveNote({
    keys: ['e/4', 'd/5'],
    duration: 'h',
  }),

  vf.StaveNote({
    keys: ['c/5', 'e/5', 'g/5'],
    duration: 'q',
  }),
];

const voice = vf.Voice().addTickables(notes);
const voice2 = vf.Voice().addTickables(notes2);

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

vf.draw();

const hairpin = new StaveHairpin({ firstNote: notes[1], lastNote: notes2[1] }, 2);
hairpin.setContext(vf.getContext());
hairpin.setPosition(4);
hairpin.draw();
