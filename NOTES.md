
Bravura and Academico together don't have:
    triangle symbol 0x25B3

Bounding box seems a bit small:
    Accidental.Bounding_Box.png
    I think I need to adjust verticals for string (not just width)

rquickjs
    I want to do "await main()" at toplevel, but I don't get exceptions that way.
    In 0.5.1 I do "main().catch((err)=>...)" then do a loop in rust side.
    Same thing works in 0.6.0!
    What is the best way to do this in rust side? Should be something like std_await

unicode codepoints
    I looked for codepoints in vexflow src/ directory.

    grep -r -o -h '\\u[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]' *.ts | sort | uniq

    This is what appears outside of \ueXXX SMUFL range:

    Academico:
    \u00b0  degree
    \u00f8  o stroke
    \u25b3  missing
    \u25cb  missing
    \u266d  flat
    \u266e  natural
    \u266f  sharp

    Bravura
    \u00b0  missing
    \u00f8  missing
    \u25b3  missing
    \u25cb  missing
    \u266d  flat
    \u266e  natural
    \u266f  sharp

    Unicode standard
    \u25b3 triangle symbol
    \u25cb halfwidth white circle

    Looks like exactly contents of tables.ts:unicode

    Why not:
    \u00b0 -> \ue870
    \u00f8 -> \ue871
    \u25b3 -> \ue873
    \u25cb -> \ue870

    Running unit tests with missing glyph reporting, these are missing:

    \ue31a
    \ue31b
    \ue3de
    \ue3df

    Verified they dont' seem to be in latest Bravura.otf

    From glyphs.ts:
        // U+E31A  Unused
        accSagittalUnused1 = '\ue31a',
        // U+E31B  Unused
        accSagittalUnused2 = '\ue31b',
        // U+E3DE  Unused
        accSagittalUnused3 = '\ue3de',
        // U+E3DF  Unused
        accSagittalUnused4 = '\ue3df',

    This affects:
        TextNote Superscript and Subscript test
    
    Also, unicode sharp/natural/flat are only used in text context.
    Should use BravuraText, that works in Inkscape.
    Or maybe AcademicoRegular? YES, it looks fine.

    EBGaramond has same glyphs present/absent as Academico (for above).

    DECISION

    Investigated when unicode non-smufl is used, it is always in text
    context. So decision is to detect SMUFL range and use Bravura in that,
    use normal font for everything else. Also remap some unicode things
    to SMUFL if they are not in Academico.

Darkening/Blurring

    At zoom=1.0, some font thin lines disappear.
    Maybe fix by darkening antialiasing?

    After investigation, this was caused by subpixel shift in tranform.
    The font was rendered at integer position with renderer set to offset,
    then the blip from pixmap to surface was offset again by 0.3 shift.
    That make things look bad.

    I could fix by supersampling pixmap and turning filterquality up, but
    that made things sharper and less antialiased. Better fix was turning
    off global transform offset.

    Implication: if the transform results in text positions that are not
    integers, then quality is degraded a bit. Maybe should look at transform
    scale/translation at least to fix this. Not worth fixing for rotations
    and skews.

    UPDATE: I was wrong here. The real issue was boundary for drawing. When
    scaling up/down a pixmap using a transform, the source pixmap must have
    a clear boundary of pixels around it. Once I added a ring of empty pixels
    everything just worked without any hassles.
