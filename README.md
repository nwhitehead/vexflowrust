# VexFlow Rust

This is a test application that renders VexFlow music notation.

The application is a standalone Rust application that uses QuickJS as the
JavaScript interpreter and various crates for graphics operations.

Currently the application runs the VexFlow test suite.

## Building

First make sure NPM packages are installed at repository root. Fonts are needed
from `node_modules/@vexflow-fonts/`.

Next make sure a normal build has been done to populate the `build/esm` output
directory (e.g. run `grunt`).

[Make sure normal Rust building tools are installed.](https://www.rust-lang.org/tools/install)

Build an optimized binary:

    cargo build --release

This should download and build all required packages.

To run test suite and generate `.png` files:

    cargo run --release

Output files are put in the `build/images/current/` directory and prefixed with `rust_`.
