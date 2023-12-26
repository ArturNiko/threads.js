## Lightweight JS tool for managing threads and concurrent task execution

<br>

### Installation

```bash 
    npm install --save @a4turp/threads
```


### Initialization

#### Threads object is getting passed to the window after importing it.

```javascript
import '@a4turp/threads.js'

const threads = new Threads(navigator.hardwareConcurrency)
```


### Running

The sequence of running tasks on different threads is pretty straightforward.
- firstly you have to push tasks and their parameters(message) into threads (Workers are getting created).
- secondly you just execute and wait for the response.

```javascript
    function test(message) {
        let paremeter = message.data
        //Do whatever you want
        postMessage(result)
    }

    /**
    *   @param task: Function, message: any 
    *   @return this
    */
    threads.push(test, 0).push(test, 0)

    /**
    *   @return any[] // basically the value that has been passed into postMessage() method.
    */
    let result = await threads.execute()
```

#### Note

 - Treat passed function like they are in Worker. ***[Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)***
    - Access passed parameter (message) on `message.data`
    - Avoid directly modifying the message to prevent potential performance issues.
    - Instead of `return` use `postMessage(returnValue)`
   
