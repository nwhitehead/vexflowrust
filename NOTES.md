
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

    This is what appears outside of \ue... SMUFL range:

    \u00b0
    \u00f8
    \u25b3
    \u25cb
    \u266d
    \u266e
    \u266f

    Looks like exactly contents of tables.ts:unicode

