import * as esbuild from 'esbuild'
import fs from 'fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const jsdomPatch = {
  name: 'jsdom-patch',
  setup(build) {
    build.onLoad({ filter: /jsdom\/living\/xhr\/XMLHttpRequest-impl\.js$/ }, async args => {
      let contents = await fs.promises.readFile(args.path, 'utf8');

      contents = contents.replace(
        'const syncWorkerFile = require.resolve ? require.resolve("./xhr-sync-worker.js") : null;',
        `const syncWorkerFile = "${require.resolve('jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js')}";`,
      );

      return { contents, loader: 'js' };
    });
  },
};

await esbuild.build({
  entryPoints: ['src/bundle.cjs'],
  platform: 'node',
  bundle: true,
  outfile: 'dist/bundle.cjs',
  loader: {
    '.node': 'copy',
  },
  plugins: [jsdomPatch],
  allowOverwrite: true,
});
