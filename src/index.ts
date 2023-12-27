import Threads from './controllers/Threads'

/* Old variant
declare global {
    interface Window {
        Threads: typeof Threads,
        availableThreads: number
    }
}

window.Threads = Threads
*/


export default Threads
