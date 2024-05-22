const TaskPool = require('./dist/index.js').TaskPool
const Threads = require('./dist/index.js').default


function test1(message) {
    let counter = message?.counter ?? 0
    const rand = Math.random() * .001
    for (let i = 0; i < 500_000_000; i++) {
        counter += i * rand > 10 ? Math.floor(i * rand) : 0
    }

    return {index: message?.index ?? 'None', counter}
}


async function run() {
    const threads = new Threads(require('os').cpus().length)

    const tasks = new TaskPool()
    for (let i = 0; i < 10; i++) {
        tasks.push({method: test1, message: {index: i, message: i}}, test1)
    }

    const result = await threads.executeParallel(tasks, {
            step: (message, progress) => console.log(message, progress),
            throttle: () => performance.now() > 2000
        }
    )

    console.log(result)
}

run().then()
