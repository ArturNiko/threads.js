import {describe, it, expect} from 'vitest'
import  Threads, {TaskPool} from '../dist/index.mjs'

describe('#Functionality', () => {
    const threadCount = 12
    const threads = new Threads(threadCount)

    const pool = new TaskPool(30)

    function square(number = 2) {
        return number * number
    }

    it('Constructing(Threads)', () => {
        const expectedMaxThreadCount = Math.min(navigator.hardwareConcurrency * 2 - 1, threadCount)
        expect(threads.maxThreadCount).toBe(expectedMaxThreadCount)
    })


    it('Constructing(Pool)', () => {
        expect(pool.pool).toBeInstanceOf(Array)
        expect(pool.pool.length).toBe(0)
    })


    it('Pool', () => {
        // Push&Insert
        pool.push(square, {method: square, message: 3}, square, square)
        pool.insert(1,{method: square, message: 10})

        expect(pool.pool.length).toBe(5)
        expect(pool.pool[1].message).toBe(10)
        expect(pool.pool[2].message).toBe(2)
        expect(pool.pool[3].index).toBe(3)

        // Remove
        pool.remove(1)

        expect(pool.pool.length).toBe(4)
        expect(pool.pool[1].message).toBe(2)
        expect(pool.pool[2].message).toBe(undefined)
        expect(pool.pool[2].index).toBe(2)

        // Clear
        pool.clear()

        expect(pool.pool.length).toBe(0)

        // Replace
        pool.push(square, {method: square, message: 2}, square, square)
        pool.replace(1,{method: square, message: 10})

        expect(pool.pool.length).toBe(4)
        expect(pool.pool[1].message).toBe(10)
        expect(pool.pool[2].message).toBe(undefined)
        expect(pool.pool[2].index).toBe(2)
    })


    it('Sequential execution', async () => {
        expect(pool.pool.length).toBe(0)
        pool.push(square, {method: square, message: 3}, square, square)

        expect(await threads.executeSequential(pool)).toBeInstanceOf(Array)

    })


})




