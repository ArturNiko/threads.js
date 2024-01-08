import Threads from './controllers/Threads'
import {TaskType} from './controllers/WorkerWrapper'
import {ExecutionMode} from './controllers/Thread'
import Threads2 from './controllers/Threads2'

/* Old variant (Uncomment to access Threads from window object)
declare global {
    interface Window {
        Threads: typeof Threads,
        availableThreads: number
    }
}

window.Threads = Threads
*/

declare global {
    interface JSON {
        validate(variable: any): boolean
    }
}



export default Threads
export {TaskType, ExecutionMode, Threads2}
