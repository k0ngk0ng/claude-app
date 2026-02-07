import { defineConfig, mergeConfig } from 'vite';
import {
  getBuildConfig,
  getBuildDefine,
  external,
  pluginHotRestart,
} from '@electron-forge/plugin-vite/dist/config/vite.base.config';

// https://electron.forge.dev/config/plugins/vite
export default defineConfig((env) => {
  const forgeEnv = env as any;

  return mergeConfig(getBuildConfig(forgeEnv), {
    build: {
      rollupOptions: {
        external: [...external],
      },
    },
    plugins: [pluginHotRestart('reload')],
    define: getBuildDefine(forgeEnv),
  });
});
