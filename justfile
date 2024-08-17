export RUST_BACKTRACE := "1"

default:
    just --list

build:
    cargo build --release --manifest-path renderer/Cargo.toml --target-dir build

build_osdm:
    node build_osdm.mjs

test:
    cargo test --release --manifest-path renderer/Cargo.toml --target-dir build
    cargo run --release --manifest-path renderer/Cargo.toml --target-dir build
    @echo "Testing done"
