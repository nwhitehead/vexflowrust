# Rust Renderer for VexFlow

## Supported Features and Limitations of Rust renderer

### Fonts

The Rust renderer bundles Bravura and four faces of Academico internally. All
glyphs are drawn from these fonts. Supporting loading fonts from files and
searching directories for fonts that match a specification is future work.

Font details are specified to the renderer through CSS-style "shorthand
property" strings. The renderer includes a primitive parser for this but the
parser has many limitations. It only supports `pt` and `px` sizes, no line
height, only supports `bold` and `italic` (not things like weights or small
caps). It supports decimal sizes and quotes around font family names.

### Colors

Fill and stroke styles are specified as CSS-style color strings. These are
parsed by the Rust renderer into RGBA format. Only some formats are supported,
including:
* `#hhh` (single hex digit rgb)
* `#hhhh` (single hex digit rgba)
* `#hhhhhh` (double hex digit rgb)
* `#hhhhhhhh` (double hex digit rgba)
* `rgb()` (numerical rgb)
* `rgba()` (numerical rgba)
* named colors (subset of browser named colors, just enough for VexFlow tests)

No gradients, patterns, masking, dashing, blend modes are supported.

Alpha blending is supported.

The `clearRect()` method directly sets the drawing surface so can be used
to erase the surface. The renderer has a clear style for erasing the image.
This means Tab fingerings are rendered nicely without white rectangles.

### Shapes

Antialiased stroking and filling of paths is supported.

Paths support:
* straight lines
* rectangles
* quadratic curves
* cubic curves
* `arc()` is supported for drawing full circles

### Drawing state

Arbitrary affine drawing transformations are supported.

The `save()` and `restore()` methods push and pop drawing state.

Drawing state keeps track of `font`, `fillStyle`, `strokeStyle`,
and `clearStyle`.

### Text rendering

Rendering of text strings and music glyphs is supported.

Text is rendered with anti-aliasing and sub-pixel precision.

Text glyphs are rendered with arbitrary affine transformation, so rotated text
works. Scaled text should not be pixelated.

Measuring text metrics is supported.

Font to use for glyph is chosen based on codepoint: SMuFL codepoints
go to Bravura and all others go to Academico.

Some codepoints are remapped for better output.

### Other unsupported

Shadows are not supported.

Blurs and other filters and effects are not supported.

The Canvas Context2D interface has endless additional capabilities that are not
implemented.

### Fake DOM

Invoking the Rust renderer involves faking a DOM and hooking into VexFlow.
Several assumptions are made about what VexFlow will call.

Assumptions during unit testing and rendering:
* `document.getElementById()` will only be called when testing `Factory` to get a canvas.
* `document.createElement("span")` is only used for font parsing.
* `document.createElement("canvas")` is only used for text measurement (no drawing).
* No other methods are called on `document`.
* No methods are called on `window`.
* For `Canvas.getContext()`, the drawing context field `canvas` will only be
used to store `width` and `height`.

For running the unit tests the Rust code swaps out
`tests/vexflow_test_helpers.ts` with a local copy that is extensively rewritten.

## VexFlow Issues I found:

These are observations I made while rendering the test cases using my alternate
Rust renderer (at https://github.com/nwhitehead/vexflowrust). These might be
issues with VexFlow, or they might be deliberate design choices, I don't have
enough context on expected behavior of VexFlow to say for sure. I thought they
were worth mentioning since they only were observable through the alternate
renderer.

## Italic and Bold-Italic Fonts

There is no font for italics defined by VexFlow (that I could find). Some of the
tests do use italics. The italic and bold italic faces don't seem to be present
in the `@vexflow-fonts/academico` package. The Rust renderer uses separate font
files for regular, italic, bold, and bold italic for Academico.

Example test that uses each different style:

| Test | Style |
| ---- | ----- |
| `EasyScore::Draw Fingerings` | bold |
| `Annotation::Fingerpicking` | italic |
| `Beam::Complex Beams with Annotations` | bold italic |

Looking at the generated SVG files can show what the actual font string is. For
example, `svg_Annotation.Fingerpicking.Bravura.svg` draws the fingerings with
`italic Bravura,Academico`. I like the look of italic Academico so the suggested
fix here is to include the italic and bold italic faces for Academico.

## Missing Unicode glyphs

One missing glyph I found was `\u25B3` "White Up-Pointing Triangle". This
codepoint was not found in Academico or Bravura. It was not in most other random
fonts on my system (but was present in some larger fonts). For the Rust renderer
I remapped this codepoint to SMuFL `\uE873` "csymMajorSeventh" from Bravura
which is an up-pointing triangle. That seemed to look OK and avoided needing a
large fallback system font. The baseline also seemed appropriate for the use as
a chord name symbol.

A similar issue was `\u25CB` "White Circle". This was not present in Academico
or Bravura and was only sometimes present in system fonts. I remapped this
codepoint to the SMuFL `\uE870` "csymDiminished". This one wasn't hit in testing
but turned up in a code search.

The other problem was `\u00F8` "Latin Small Letter O with Stroke". This was used
in a test to show a half-dimished chord. This symbol was not present in
Academico or Bravura, but was present in many system fonts. In the Rust renderer
I remapped this codepoint to SMuFL `\uE871` "csymHalfDiminished". I preferred
that look.

For suggested fix: I'm not sure the best way to fix this. One way would be for
Bravura to include more SMuFL glyphs in the regular unicode range to handle
chords more nicely. Another fix could be for VexFlow to do a text replacement
before drawing text.

## Missing SMuFL glyphs

There were several other missing glyphs for codepoints referred to from the test
`Accidental::Cautionary Accidental` on output lines 8 and 16. The set was:

    \uE31A "accSagittalUnused1"
    \uE31B "accSagittalUnused2"
    \uE3DE "accSagittalUnused3"
    \uE3DF "accSagittalUnused4"

As of [SMuFL 1.5
draft](https://w3c.github.io/smufl/latest/tables/spartan-sagittal-multi-shaft-accidentals.html)
they are currently marked "Unused". The VexFlow code using them is referring to
them as unused in the glyph name. In the Rust renderer I mapped these to
`\u0020` "Space" to avoid warnings about glyphs not found but to have the same
output. You can see the missing spots in the current VexFlow test output on
lines 8 and 16 (pairs of blank accidentals).

Suggested fix: maybe do nothing, maybe update cautionary accidental code, maybe
update test. I'm not sure how Sagittal accidentals work and where the real issue
is. But it does seem like trying to draw non-existent glyphs indicates a bug
somewhere.

## Sub-pixel alignment

This is a personal preference thing. The default sub-pixel alignment used by the
tests places staff lines between pixels. Anti-aliasing will draw these lines as
equally gray 2 pixels wide. Shifting the global alignment vertically by 0.5
pixels makes the lines hit the pixels directly and be drawn 1 pixel wide but
darker. My personal preference is a vertical offset by 0.3 pixels which draws
staff lines as one dark line and one light gray line adjacent. This looks
sharper to me while still being smooth. Implementing this is one-line in setup:

    ctx.translate(0, -0.3)
