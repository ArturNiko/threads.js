const Executor: any = (async () => {
    return typeof window === 'undefined' && typeof process !== 'undefined' && process.versions != null && process.versions.node != null
        ? await import('./Executor.node.ts').then((module) => module.default)
        : await import('./Executor.browser.ts').then((module) => module.default)
})()


export default Executor