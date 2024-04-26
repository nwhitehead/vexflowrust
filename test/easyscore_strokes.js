const { Stroke } = VF;

const score = vf.EasyScore();
const system = vf.System();

const notes2 = score.notes('(c4 e4 g4)/4, (c4 e4 g4), (c4 d4 g4), (c4 d4 a4)', { stem: 'up' });
notes2[0].addStroke(0, new Stroke(1));
notes2[1].addStroke(0, new Stroke(2));
notes2[2].addStroke(0, new Stroke(3));

system
  .addStave({
    voices: [
      score.voice(notes2),
    ],
  })
  .addClef('treble')
  .addTimeSignature('4/4');

vf.draw();
