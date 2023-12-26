


### Light and easy web-tool for accessing multiple threads via web workers.

## Features 

- Access to multiple threads.
<br />


## Notes

This is **WEB**-tool.

<br />


## Installation

```bash 
    npm install --save @a4turp/threads
```

### Initialization

#### Threads is getting passed to the window after importing it

```javascript
import '@a4turp/threads'

const threads = new Threads(navigator.hardwareConcurrency)
```