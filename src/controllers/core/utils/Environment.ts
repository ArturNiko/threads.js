import {HybridExecutor} from '../../../types/core/Executor.ts'
import BrowserExecutor from '../Executor.browser.ts'
import NodeExecutor from '../Executor.node.ts'

export default class Environment {
    static #isNode: boolean = typeof window === 'undefined' && typeof process !== 'undefined' && process.versions != null && process.versions.node != null
    static #executor: any = null
    static #threads: number = 0

    static threads(): number {
        if (Environment.#threads) return Environment.#threads

        return Environment.#threads = Environment.#isNode ? require('os').cpus().length - 1 : navigator.hardwareConcurrency - 1
    }

    static async executor(): Promise<new() => HybridExecutor> {
        if (Environment.#executor) return Environment.#executor

        return Environment.#executor = Environment.#isNode
            ? await import('../Executor.node.ts').then((module) => module.default) as typeof NodeExecutor
            : await import('../Executor.browser.ts').then((module) => module.default) as typeof BrowserExecutor
    }

    static async requestAnimationFrame(): Promise<void> {
        return new Promise<void>(resolve => {
            if (typeof requestAnimationFrame !== 'undefined') {
                requestAnimationFrame(() => resolve())
            } else {
                // Node.js environment
                setTimeout(resolve, 16.666)
            }
        })
    }
}