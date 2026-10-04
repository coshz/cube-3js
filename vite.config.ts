import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
    base: '/demo/cube/',
    optimizeDeps: {
        exclude: [
            '@coshz/jscube' // prevent vite pre-bundler from ignoring static assets like *.wasm 
        ] 
    },
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/@coshz/jscube/dist/internal/jscube.web.*',
                    dest: 'assets/internal',
                    rename: { stripBase: true }
                }
            ]
        })
    ]
});