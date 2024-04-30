const { Stroke } = VF;

const score = vf.EasyScore();
const system = vf.System();

const notes2 = score.notes('(c4 c5)/4, (c4 c5), (c4 c5), (c4)', { stem: 'up' });
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
