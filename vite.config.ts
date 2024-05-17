import { defineConfig } from 'vite'


export default defineConfig({
    build: {
        target: "es2022",
    },
    esbuild: {
        include: ["src/**/*.ts", "src/**/*.tsx"]
    },
    test: {
        globals: true,
        environment: "happy-dom",
    }
})
