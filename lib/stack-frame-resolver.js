const StackFrame = require('stack-frame').default;

const REG_V8_WEEX = /\(weex\):(\d+):(\d+)/;
const REG_JSC_WEEX = /native-bundle-main\.js:(\d+):(\d+)/;
const REG_BUNDLE = /[^)]:(\d+):(\d+)/;

function resolve(stack) {
  const ret = [];

  stack.forEach((msg) => {
    if (REG_JSC_WEEX.test(msg)) {
      const matches = REG_JSC_WEEX.exec(msg);
      const [, lineNum, colNum] = matches;
      ret.push(new StackFrame(null, 'jsc', parseInt(lineNum, 10), parseInt(colNum, 10)));
    } else {
      if (REG_BUNDLE.test(msg)) {
        const matches = REG_BUNDLE.exec(msg);
        const [, lineNum, colNum] = matches;
        const type = /native-bundle-main/.test(stack.join(',')) ? 'jsc-bundle' : 'v8-bundle';
        ret.push(new StackFrame(null, type, parseInt(lineNum, 10), parseInt(colNum, 10)));
      }

      if (REG_V8_WEEX.test(msg)) {
        const matches = REG_V8_WEEX.exec(msg);
        const [, lineNum, colNum] = matches;
        ret.push(new StackFrame(null, 'v8', parseInt(lineNum, 10), parseInt(colNum, 10)));
      }

      if (!REG_BUNDLE.test(msg) && !REG_V8_WEEX.test(msg)) {
        ret.push(new StackFrame(msg, null, null, null));
      }
    }
  });

  return ret;
}

module.exports.resolveStack = (ex) => {
  if (!ex) {
    throw new Error('The exception stack is null!');
  }

  if (typeof ex === 'string') {
    return resolve(ex.split('\n'));
  } else if (Array.isArray(ex)) {
    return resolve(ex);
  }

  throw new Error('Error exception format!');
};
