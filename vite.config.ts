import { defineConfig } from 'vite'


export default defineConfig({
    build: {
        target: "es2019",
    },
    test: {
        globals: true,
        environment: "happy-dom",
        coverage: {
            provider: "istanbul",
            include: ['src/**/*.ts'],

        }
    }
})