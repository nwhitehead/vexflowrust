const { Modifier, StaveConnector, Accidental, TabStave, TabNote, Bend, Vibrato, Beam, Dot, Stave, StaveNote, StaveTie, Voice, Formatter } = VF;

// Measure 1
const stave1 = new Stave(150, 10, 300);
const stave2 = new Stave(150, 100, 300);
stave1.setStaveText('Violin', Modifier.Position.LEFT);
stave1.setContext(context);
stave2.setContext(context);
const connBrace = new StaveConnector(stave1, stave2);
connBrace.setType(StaveConnector.type.BRACE);
connBrace.setText('Harpsichord');
connBrace.setContext(context);
stave1.draw();
stave2.draw();
connBrace.draw();
