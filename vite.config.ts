import { defineConfig } from "vite";
import packageJson from './package.json';

export default defineConfig({
    base: '/demo/cube/',
    worker: { format: 'es' },
    define: {
        '__APP_VERSION__': JSON.stringify(packageJson.version),
        '__JSCUBE_VERSION__': JSON.stringify(packageJson.dependencies['@coshz/jscube'])
    }
});