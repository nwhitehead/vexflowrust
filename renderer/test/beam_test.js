const { Metrics, FontWeight, AnnotationVerticalJustify, FontStyle, Accidental, TabStave, TabNote, Bend, Vibrato, Beam, Dot, Stave, StaveNote, StaveTie, Voice, Formatter } = VF;

const stave = factory.Stave({ x:10, y:40, width:400});

const font = {
    family: Metrics.get('Annotation.fontFamily'),
    size: 14,
    weight: FontWeight.BOLD,
    style: FontStyle.ITALIC,
};
console.log(`font.family=${font.family} font.weight=${font.weight}`);

const s1 = [
    { keys: ['e/4'], duration: '128', stemDirection: 1 },
    { keys: ['d/4'], duration: '16', stemDirection: 1 },
    { keys: ['e/4'], duration: '8', stemDirection: 1 },
    { keys: ['c/4', 'g/4'], duration: '32', stemDirection: 1 },
    { keys: ['c/4'], duration: '32', stemDirection: 1 },
    { keys: ['c/4'], duration: '32', stemDirection: 1 },
    { keys: ['c/4'], duration: '32', stemDirection: 1 },
];

const notes1 = s1.map((struct) =>
    factory
        .StaveNote(struct)
        .addModifier(factory.Annotation({ text: '1', vJustify: AnnotationVerticalJustify.TOP, font }), 0)
);

factory.Beam({ notes: notes1 });
const voice = factory.Voice().setMode(Voice.Mode.SOFT).addTickables(notes1);
factory.Formatter().joinVoices([voice]).formatToStave([voice], stave, { stave: stave });

factory.draw();
