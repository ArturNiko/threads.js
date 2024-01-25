import TaskPoolInterface, {Task} from '../../types/partials/TaskPool'

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export default class TaskPool implements TaskPoolInterface {
    #pool: Task[] = []
    maxSize: number = 999

    constructor(maxSize?: number) {
        this.maxSize = maxSize ?? this.maxSize
    }

    push(...tasks: (PartialBy<Task, 'index'> | Function)[]): this {
        if(!this.#checkSize(tasks)) return this

        const preparedTasks = this.#prepareTasks(tasks)
        this.#pool.push(...preparedTasks)

        this.#reindexPool()

        return this
    }

    insert(index: number, ...tasks: (PartialBy<Task, 'index'> | Function)[]): this {
        if(!this.#checkSize(tasks)) return this

        this.#pool = [
            ...this.#pool.slice(0, index),
            ...this.#prepareTasks(tasks),
            ...this.#pool.slice(index)
        ]

        this.#reindexPool()

        return this
    }

    replace(index: number, ...tasks: (PartialBy<Task, 'index'> | Function)[]): this {
        this.#pool = [
            ...this.#pool.slice(0, index),
            ...this.#prepareTasks(tasks),
            ...this.#pool.slice(index + tasks.length)
        ]

        this.#reindexPool()

        return this
    }

    grab(index: number, length: number = 1): Task[] {
        const grabbedTasks: Task[] = this.#pool.splice(index, length)

        this.#reindexPool()

        return grabbedTasks
    }

    pop(): this {
        this.#pool.pop()

        return this
    }

    shift(): this {
        this.#pool.shift()

        this.#reindexPool()

        return this
    }

    remove(index: number, length: number = 1): this {
        this.#pool.splice(index, length)

        this.#reindexPool()

        return this
    }

    clear(): this {
        this.#pool.length = 0

        return this
    }

    #prepareTasks(pool: (PartialBy<Task, 'index'> | Function)[]): Task[] {
        pool.forEach((task, index) => {
            if (typeof task === 'function') pool[index] = {index: 0, method: task}
        })

        return pool as Task[]
    }

    #reindexPool() {
        this.#pool.forEach((_, index) => {
            this.#pool[index].index = index
        })
    }

    #checkSize(tasks: (PartialBy<Task, 'index'> | Function)[]) {
        if(this.#pool.length + tasks.length > this.maxSize) {
            console.warn('Pool size will exceed max size')

            return false
        }

        return  true
    }

    get pool(): Task[] {
        return this.#pool
    }


    get length(): number {
        return this.#pool.length
    }
}