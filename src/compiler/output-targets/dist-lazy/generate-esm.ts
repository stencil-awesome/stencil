import { generatePreamble } from '@utils';
import { join } from 'path';
import type { OutputOptions, RollupBuild } from 'rollup';

import type * as d from '../../../declarations';
import type { RollupResult } from '../../../declarations';
import { generateRollupOutput } from '../../app-core/bundle-app-core';
import { relativeImport } from '../output-utils';
import { generateLazyModules } from './generate-lazy-module';

export const generateEsm = async (
  config: d.ValidatedConfig,
  compilerCtx: d.CompilerCtx,
  buildCtx: d.BuildCtx,
  rollupBuild: RollupBuild,
  outputTargets: d.OutputTargetDistLazy[]
): Promise<d.UpdatedLazyBuildCtx> => {
  const esmEs5Outputs = config.buildEs5 ? outputTargets.filter((o) => !!o.esmEs5Dir && !o.isBrowserBuild) : [];
  const esmOutputs = outputTargets.filter((o) => !!o.esmDir && !o.isBrowserBuild);
  if (esmOutputs.length + esmEs5Outputs.length > 0) {
    const esmOpts: OutputOptions = {
      banner: generatePreamble(config),
      format: 'es',
      entryFileNames: '[name].js',
      assetFileNames: '[name]-[hash][extname]',
      preferConst: true,
      sourcemap: config.sourceMap,
    };
    const outputTargetType = esmOutputs[0].type;
    const output = await generateRollupOutput(rollupBuild, esmOpts, config, buildCtx.entryModules);

    if (output != null) {
      const es2017destinations = esmOutputs.map((o) => o.esmDir);
      buildCtx.esmComponentBundle = await generateLazyModules(
        config,
        compilerCtx,
        buildCtx,
        outputTargetType,
        es2017destinations,
        output,
        'es2017',
        false,
        ''
      );

      const es5destinations = esmEs5Outputs.map((o) => o.esmEs5Dir);
      buildCtx.es5ComponentBundle = await generateLazyModules(
        config,
        compilerCtx,
        buildCtx,
        outputTargetType,
        es5destinations,
        output,
        'es5',
        false,
        ''
      );

      await copyPolyfills(config, compilerCtx, esmOutputs);
      await generateShortcuts(config, compilerCtx, outputTargets, output);
    }
  }

  return { name: 'esm', buildCtx };
};

const copyPolyfills = async (
  config: d.ValidatedConfig,
  compilerCtx: d.CompilerCtx,
  outputTargets: d.OutputTargetDistLazy[]
): Promise<void> => {
  const destinations = outputTargets.filter((o) => o.polyfills).map((o) => o.esmDir);
  if (destinations.length === 0) {
    return;
  }

  const src = join(config.sys.getCompilerExecutingPath(), '..', '..', 'internal', 'client', 'polyfills');
  const files = await compilerCtx.fs.readdir(src);

  await Promise.all(
    destinations.map((dest) => {
      return Promise.all(
        files.map((f) => {
          return compilerCtx.fs.copyFile(f.absPath, join(dest, 'polyfills', f.relPath));
        })
      );
    })
  );
};

const generateShortcuts = (
  config: d.ValidatedConfig,
  compilerCtx: d.CompilerCtx,
  outputTargets: d.OutputTargetDistLazy[],
  rollupResult: RollupResult[]
): Promise<void[]> => {
  const indexFilename = rollupResult.find((r) => r.type === 'chunk' && r.isIndex).fileName;

  return Promise.all(
    outputTargets.map(async (o) => {
      if (o.esmDir && o.esmIndexFile) {
        const entryPointPath =
          config.buildEs5 && o.esmEs5Dir ? join(o.esmEs5Dir, indexFilename) : join(o.esmDir, indexFilename);

        const relativePath = relativeImport(o.esmIndexFile, entryPointPath);
        const shortcutContent = `export * from '${relativePath}';`;
        await compilerCtx.fs.writeFile(o.esmIndexFile, shortcutContent, { outputTargetType: o.type });
      }
    })
  );
};
