
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


Darkening
    At zoom=1.0, some font thin lines disappear.
     