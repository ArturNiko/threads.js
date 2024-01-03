import Threads from './controllers/Threads'

/* Old variant (Uncomment to access Threads from window object)
declare global {
    interface Window {
        Threads: typeof Threads,
        availableThreads: number
    }
}

window.Threads = Threads
*/


export default Threads
