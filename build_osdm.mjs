import * as esbuild from 'esbuild';
import { glsl } from 'esbuild-plugin-glsl';

await esbuild.build({
    entryPoints: ['opensheetmusicdisplay/src/index.ts'],
    bundle: true,
    sourcemap: true,
    outfile: 'build/osdm.js',
    plugins: [glsl({
        minify: true,
    })],
})
