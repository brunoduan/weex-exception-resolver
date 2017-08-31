# weex exception resolver

This is a library to resolve the exception stack with v8 formated from weex through [source-map](https://github.com/mozilla/source-map).

## Installation

```
npm install --save weex-exception-resolver
```

## Usage

The exception stack contains two types of [StackFrame](https://www.npmjs.com/package/stack-frame)
- StackFrame from main.js(weex js framework)
- StackFrame from a bundle

To resolve the exception stack, you need to feed the resolver with two map paths:

```shell
bin/exception-resolver -m "path to your main.js.map" -b "path to your bundle.map" -s "exception"
```

Then, you can get the resolved exception stack from stdout.

The exception above is a line-break-separated String, take a look at the following example:
`mo is not defined\n at eval (eval at _ ((weex):4:20831), <anonymous>:10:226712)\n at ws.consume ((weex):2:23939)\n at As.callback ((weex):2:28618)\n at f ((weex):4:18640)\n at C.callback ((weex):4:21679)\n at (weex):4:18890\n at Array.forEach (native)\n at Object.d [as receiveTasks] ((weex):4:18787)\n at Object.V.$s.(anonymous function) [as callJS] ((weex):1:9421)\n at global.(anonymous function) ((weex):8:12332)`

## Features

- Support v8-formated js stack
- TODO: jsc-formated js stack

## License

Copyright &copy; 2017 by Bruno Duan. Released under the MIT license.
