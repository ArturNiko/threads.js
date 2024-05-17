export default class Environment {
    static #isNode: boolean = typeof window === 'undefined' && typeof process !== 'undefined' && process.versions != null && process.versions.node != null
    static #executor: any = null
    static #threads: number = 0

    static threads(): number {
        console.log(1)
        if(Environment.#threads) return Environment.#threads

        return Environment.#threads = Environment.#isNode ? require('os').cpus().length - 1: navigator.hardwareConcurrency * 2 - 1
    }

    static async executor(): Promise<any> {
        console.log(1)
        if(Environment.#executor) return Environment.#executor

        return Environment.#executor = Environment.#isNode
            ? await import('../core/Executor.node.ts').then((module) => module.default)
            : await import('../core/Executor.browser.ts').then((module) => module.default)
    }
}

