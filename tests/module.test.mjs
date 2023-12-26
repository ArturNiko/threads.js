import {describe, it, expect} from 'vitest'
import  '../dist/index.mjs'

describe('#Functionality', () => {
    const threads = new  Threads(100)

    it('Constructing', () => {
        expect(threads.threads.length).toEqual(navigator.hardwareConcurrency - 1 ?? 3)
    })
})




