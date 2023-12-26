import Threads from './controllers/Threads'

declare global {
    interface Window {
        Threads: typeof Threads,
        availableThreads: number
    }
}

window.Threads = Threads

