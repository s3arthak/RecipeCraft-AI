// vite.config.js (CJS — dynamically import ESM plugin)
const { defineConfig } = require('vite');

module.exports = defineConfig(async () => {
  const reactPlugin = await import('@vitejs/plugin-react');
  return {
    plugins: [reactPlugin.default()],
    server: { port: 5173 }
  };
});
