const sourceMap = require('source-map')
  , loader = require('path-loader')
  , parse = require('./lib/stack-frame-resolver').resolveStack

const regexV8JSFM = /weex/
  , regexV8Bundle = /<anonymous>/

const exception = 'h is not definedundefinedReferenceError: h is not defined\n at eval (eval at _ ((weex):4:20831), <anonymous>:10:226712)\n at ws.consume ((weex):2:23939)\n at As.callback ((weex):2:28618)\n at f ((weex):4:18640)\n at C.callback ((weex):4:21679)\n at (weex):4:18890\n at Array.forEach (native)\n at Object.d [as receiveTasks] ((weex):4:18787)\n at Object.V.$s.(anonymous function) [as callJS] ((weex):1:9421)\n at global.(anonymous function) ((weex):8:12332)';

/**
 * Correct the line number for weex bundle:
 * - We insert two lines above the header of the bundle.
 * - Weex uses new Function to compile the bundle, and dive into v8 implementation of 
 *   Function constructor code, we find out that v8 adds two lines before the bundle
 *   contents at the v8 implementation level.
 *
 * Finally, we need to subtract four from the orignal line number.
 */
function correctLineNumber(lineNumber) {
  return lineNumber -= 4;
}

function getOriginalPositionFor (smc, line, column) {
  const mapPos = { line, column };
  const pos = smc.originalPositionFor(mapPos);
  if (!pos.source) {
    console.error('Mapping not found');
    return null;
  }

  return pos;
}

function parseException(jsfmMapConsumer, bundleMapConsumer, ex) {
  const stack = [];
  const uglifyFrames = parse(ex);
  uglifyFrames.forEach(uglifyFrame => {
    var fileName = uglifyFrame.fileName
      , lineNumber = uglifyFrame.lineNumber
      , columnNumber = uglifyFrame.columnNumber
      , functionName = uglifyFrame.functionName;
    lineNumber = parseInt(lineNumber, 10)
    columnNumber = parseInt(columnNumber, 10)
    var pos;
    // Resolve the frame stack from main.js
    if (regexV8JSFM.test(fileName)) {
      pos = getOriginalPositionFor(jsfmMapConsumer, lineNumber, columnNumber);
    } else if (regexV8Bundle.test(fileName)) {
      lineNumber = correctLineNumber(lineNumber);
      pos = getOriginalPositionFor(bundleMapConsumer, lineNumber, columnNumber);
    } else {
      pos = null;
    }

    if (pos) {
      const name = pos.name || '';
      stack.push([name, [pos.source, pos.line, pos.column].join(':')].join(' '));
    } else {
      if (!lineNumber) {
        stack.push([functionName, fileName].join(' '))
      } else {
        stack.push([functionName, fileName].join(' ') + ':' + lineNumber + ':' + columnNumber)
      }
    }
  });

  console.log(stack.join('\n'))

  return stack;
}

function loadUri(path) {
  return loader.load(path).then(JSON.parse);
}

function resolve(jsfmPath, bundlePath, ex) {
  var loadUris = [jsfmPath, bundlePath]
    .map(function(path) {
      return loadUri(path);
    });

  Promise
    .all(loadUris)
    .then(function(contents) {
      var maps = contents
        .map(function(content) {
          return new sourceMap.SourceMapConsumer(content);
        });

      return parseException(...maps, ex);
    })
    .catch(function(err) {
      console.log(err);
    })
}

module.exports = {
  resolve
}
