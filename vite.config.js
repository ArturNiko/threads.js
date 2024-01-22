import { defineConfig } from 'vite'


export default defineConfig({
    build: {
        target: "es2019",
    },
    esbuild: {
        include: ["src/index.ts"]
    },
    test: {
        globals: true,
        environment: "happy-dom",
    }
})