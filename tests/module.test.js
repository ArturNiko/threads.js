import Threads, {TaskPool} from '../src/index.ts'

describe('#Functionality', () => {
    const threadCount = 12
    const threads = new Threads(threadCount)

    const pool = new TaskPool(30)

    function square(num = 2) {
        return num * num
    }

    it('Constructing(Threads)', () => {
        expect(threads.maxThreadCount).toBe(navigator.hardwareConcurrency - 1)
    })


    it('Constructing(Pool)', () => {
        expect(pool.pool).toBeInstanceOf(Array)
        expect(pool.pool.length).toBe(0)
    })


    it('Pool', () => {
        // Push&Insert

        // square, [square, 3], square, square
        pool.push(square, {method: square, message: 3}, square, square)
        // square, [square, 10], [square, 3], square, square
        pool.insert(1, {method: square, message: 10})

        expect(pool.length).toBe(5)
        expect(pool.pool[1].message).toBe(10)
        expect(pool.pool[2].message).toBe(3)
        expect(pool.pool[3].index).toBe(3)

        // Remove

        // square, [square, 3], square, square
        pool.remove(1)

        expect(pool.length).toBe(4)
        expect(pool.pool[1].message).toBe(3)
        expect(pool.pool[2].message).toBe(undefined)
        expect(pool.pool[2].index).toBe(2)

        // Clear

        // empty
        pool.clear()

        expect(pool.pool.length).toBe(0)

        // Replace

        // square, [square, 2], [square, 3], square
        pool.push(square, {method: square, message: 2}, {method: square, message: 3}, square)
        // square, [square, 10], [square, 3], square
        pool.replace(1, {method: square, message: 10})

        expect(pool.length).toBe(4)
        expect(pool.pool[1].message).toBe(10)
        expect(pool.pool[2].message).toBe(3)
        expect(pool.pool[2].index).toBe(2)

        // Grab

        // [square, 10], [square, 3], square
        const grabbedTask = pool.grab(0)[0]

        expect(grabbedTask.message).toBe(undefined)
        expect(pool.length).toBe(3)
        expect(pool.pool[0].message).toBe(10)
        expect(pool.pool[1].message).toBe(3)
        expect(pool.pool[1].index).toBe(1)

        // Shift

        // [square, 3], square
        pool.shift()

        expect(pool.length).toBe(2)
        expect(pool.pool[0].message).toBe(3)
        expect(pool.pool[1].message).toBe(undefined)
        expect(pool.pool[1].index).toBe(1)

        // Pop

        // [square, 3]
        pool.pop()

        expect(pool.length).toBe(1)
        expect(pool.pool[0].message).toBe(3)
        expect(pool.pool[0].index).toBe(0)

        // Max size

        const pool2 = new TaskPool(2)

        pool2.push(square, {method: square, message: 3})
        pool2.push(square)
        expect(pool.length).toBe(2)

        pool2.insert(1, square)
        expect(pool.length).toBe(2)


    })

    /* Worker is not defined
    it('Sequential execution', async () => {
        pool.push(square, {method: square, message: 3}, square, square)

        expect(await threads.executeSequential(pool)).toBeInstanceOf(Array)
    })
     */

})




