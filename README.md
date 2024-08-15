# VexFlow Rust

This is a test application that renders VexFlow music notation.

The application is a standalone Rust application that uses QuickJS as the
JavaScript interpreter and various crates for graphics operations.

Currently the application runs the VexFlow test suite.

## Building

First make sure NPM packages are installed at repository root with `npm i`.
Fonts are needed from `node_modules/@vexflow-fonts/`.

Bundle the VexFlow module with `just bundle`.

[Make sure normal Rust building tools are installed.](https://www.rust-lang.org/tools/install)

Build with `just build`.

This should download and build all required packages.

To run test suite and generate `.png` files:

    just test

Output files are put in the `build/images/current/` directory and prefixed with `rust_`.
