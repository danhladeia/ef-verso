export default {
  esbuild: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  build: { target: 'esnext', minify: false },
};
