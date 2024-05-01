export RUST_BACKTRACE := "1"

default:
    just --list

bundle:
    cp vexflow/tests/vexflow_test_helpers.ts /tmp/vexflow_test_helpers.ts
    cp renderer/src/vexflow_test_helpers.ts vexflow/tests/vexflow_test_helpers.ts
    esbuild vexflow/entry/vexflow-debug-with-tests.ts --tsconfig=tsconfig.json --bundle --log-level=silent --format=esm --outfile=build/vexflow-debug-with-tests.js
    esbuild vexflow/entry/vexflow.ts --tsconfig=tsconfig.json --bundle --minify --log-level=silent --format=esm --outfile=build/vexflow.js
    cp /tmp/vexflow_test_helpers.ts vexflow/tests/vexflow_test_helpers.ts

build:
    cargo build --release --manifest-path renderer/Cargo.toml --target-dir build

test:
    cargo test --release --manifest-path renderer/Cargo.toml --target-dir build
    cargo run --release --manifest-path renderer/Cargo.toml --target-dir build
    @echo "Testing done"
