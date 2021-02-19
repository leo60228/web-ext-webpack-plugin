import path from 'path';
import { fileURLToPath } from 'url';
import webExt from 'web-ext';

const cwd = path.dirname(fileURLToPath(import.meta.url));

const pluginName = 'WebExtWebpackPlugin';

class WebExtWebpackPlugin {
  constructor(sourceDir, options = {
    artifactsDir: path.join(sourceDir, 'web-ext-artifacts'),
    browserConsole: false,
  }) {
    this.runner = null;
    this.watchMode = false;
    this.sourceDir = path.resolve(cwd, sourceDir);
    this.options = options;
  }

  apply(compiler) {
    const watchRun = async (compiler) => {
      this.watchMode = true;
    };

    const afterEmit = async (compilation) => {
      try {
        await webExt.cmd.lint({
          boring: false,
          metadata: false,
          output: 'text',
          pretty: false,
          sourceDir: this.sourceDir,
          verbose: false,
          warningsAsErrors: true,
          ...this.options
        }, {
          shouldExitProgram: false,
        });

        if (!this.watchMode) {
          return;
        }

        if (this.runner) {
          this.runner.reloadAllExtensions();
          return;
        }

        await webExt.cmd.run({
          sourceDir: this.sourceDir,
          noReload: true,
          ...this.options
        }, { }).then((runner) => this.runner = runner);

        if (!this.runner) {
          return;
        }

        this.runner.registerCleanup(() => {
          this.runner = null;
        });
      } catch (err) {
        console.log(err);
      }
    };

    if (compiler.hooks) {
      compiler.hooks.afterEmit.tapPromise({ name: pluginName }, afterEmit);
      compiler.hooks.watchRun.tapPromise({ name: pluginName }, watchRun);
    } else {
      compiler.plugin('afterEmit', afterEmit);
      compiler.plugin('watchRun', watchRun);
    }
  }
}

export default WebExtWebpackPlugin;
