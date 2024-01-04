import Threads from './controllers/Threads'
import {TaskType} from './controllers/WorkerWrapper'
import {ExecutionMode} from './controllers/Thread'

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
export {TaskType, ExecutionMode}
