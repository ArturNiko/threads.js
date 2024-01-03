## Lightweight JS tool for managing threads and concurrent task execution
#### Migrated from [`@a4turp/multithreading`](https://www.npmjs.com/package/@a4turp/multithreading)
<br>

### Table of Contents
 - [**Installation**](#installation)
 - [**Initialization**](#initialization)
   - [**Options**](#options)
 - [**Running**](#running)
   - [**Push**](#push)
   - [**Execute**](#execute)
   - [**Note**](#note)

### Installation

```bash 
    npm install --save @a4turp/threads.js
```


### Initialization
```typescript
    import Threads from '@a4turp/threads.js'

   
    // Maximum number of threads is navigator.hardwareConcurrency -1 || 3
    const threads = new Threads(navigator.hardwareConcurrency, options)
```

#### Options
Several options are available to configure messages and responses during execution. 
Pass them either into the constructor or change them afterward.

```typescript
    enum ExecutionMode {
        /**
         * Messages are sent from passed parameter (message) to the task
         * 
         * Response is array of all responses from each thread (in order of pushed tasks)
        */
        REGULAR = 'regular',

        /**
         * Messages are chained from the last response to the next task
         * (initial message is passed as parameter from first pushed task)
         * 
         * Response is array of last responses from each thread
         */
        CHAINED = 'chained',
    }

    interface OptionsInterface {
        executionMode?: ExecutionMode,
    }
```

### Running
The sequence of running tasks on different threads is straightforward.
- Firstly, push tasks and their parameters (message) into thread pools (Workers are created).
- Secondly, execute tasks and wait for the response.

#### Push
Here is the showcase of pushing
```typescript
    function test(message) {
        let parameter = message.data
        //Do whatever you want
        postMessage(result)
    }

    interface TaskOptionsInterface  {
        // Task parameter (accessible in message.data)
        message?: any,
        // Push the task into a specific thread
        index?: number
    }
    /**
     *  @param task: Function, options?: TaskOptionsInterface
     *  @return this
     *
     *  There are multiple ways to push the task (function) into a thread.
    */

    // Push the task into the thread with least amount of tasks and that is not busy
    threads.push(test)
    // Push the task with a parameter into the thread with least amount of tasks and that is not busy
    threads.push(test, {message: 'test'})
    // Push the task into a spercific thread with a parameter (if not busy)
    threads.push(test, {message: 'test', index: 0})
    // You can also push multiple tasks at once 
    threads.push(test, {message: 'test'}).push(test, {index: 0}).push(test)
```

#### Execute
Here is the showcase of execution
```typescript
   interface ExecuteOptionsInterface {
        // Execution mode (default: REGULAR)
        mode?: ExecutionMode,
        // Execute tasks on specific thread
        index?: number,
        // Callback function called after each task is executed
        stepCallback?: Function
    }
    
    /**
     *  @param options?: ExecuteOptionsInterface
     *  @return Promise<any[]|void>
     *
     *  There are multiple ways to execute the tasks.
    */
    
    // Execute all tasks on all threads that are not busy and have tasks
    await threads.execute()
    // Execute all tasks on specific thread (if not busy and has tasks)
    await threads.execute({index: 0})
    // Execute all tasks on all threads with callback function
    /**
    * @param response: any // Executed task response
    * @param thread: Thread (object) // Thread that executed the task
    */
    await threads.execute({stepCallback: (response, thread) => console.log(response)})
    // Execute all tasks on all threads with specific execution mode
    await threads.execute({mode: ExecutionMode.CHAINED})
    // You can also combine all options
    await threads.execute({index: 0, mode: ExecutionMode.CHAINED, stepCallback: (response) => console.log(response)})
```

#### Note
- Treat passed functions as if they are in a Web Worker. [Learn more about the Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).
   - Access the passed parameter (`message`) using `message.data`.
   - Avoid directly modifying the `message` parameter to prevent potential performance issues.
   - Instead of `return`, use `postMessage(returnValue)`.
   
   
