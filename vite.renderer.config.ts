import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { pluginExposeRenderer } from '@electron-forge/plugin-vite/dist/config/vite.base.config';

// https://electron.forge.dev/config/plugins/vite
export default defineConfig((env) => {
  const forgeEnv = env as any;
  const name = forgeEnv.forgeConfigSelf?.name ?? 'main_window';

  return {
    plugins: [pluginExposeRenderer(name), react(), tailwindcss()],
    build: {
      sourcemap: true,
    },
    resolve: {
      alias: {
        '@renderer': '/src/renderer',
      },
      preserveSymlinks: true,
    },
    clearScreen: false,
  };
});
