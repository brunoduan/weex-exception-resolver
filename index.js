const sourceMap = require('source-map');
const loader = require('path-loader');
const parse = require('./lib/stack-frame-resolver').resolveStack;
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

function correctV8LineNumber(lineNumber) {
  return lineNumber - 4 < 1 ? 1 : (lineNumber - 4);
}

function correctJSCLineNumber(lineNumber) {
  return lineNumber - 3 < 1 ? 1 : (lineNumber - 3);
}

function correctJSCColumnNumber(columnNumber) {
  return columnNumber - 1;
}

function getOriginalPositionFor(smc, line, column) {
  const mapPos = { line, column };
  const pos = smc.originalPositionFor(mapPos);
  if (!pos.source) {
    console.error('Mapping not found');
    return null;
  }

  return pos;
}

function getOriginalPositionForConsumers(consumers, lineNumber, columnNumber) {
  return consumers.map(consumer => getOriginalPositionFor(consumer, lineNumber, columnNumber));
}

function parseException(consumers, ex) {
  const uglifyFrames = parse(ex);

  return uglifyFrames.map((uglifyFrame) => {
    const {
      fileName,
      lineNumber,
      columnNumber,
      functionName,
    } = uglifyFrame;

    if ((fileName === 'v8' || fileName === 'jsc') && lineNumber !== null) {
      const jsfmMapConsumer = consumers[0];
      const pos = getOriginalPositionFor(jsfmMapConsumer, lineNumber, columnNumber);
      return !pos ? (functionName || '').trim() : `at ${pos.name} (${pos.source} (${pos.line}:${pos.column}))`;
    } else if (fileName === 'v8-bundle' && lineNumber !== null) {
      return getOriginalPositionForConsumers(consumers.slice(1), correctV8LineNumber(lineNumber), columnNumber)
        .map(pos => (!pos ? (functionName || '').trim() : `at ${pos.name} (${pos.source} (${pos.line}:${pos.column}))`))
        .join('\n or ');
    } else if (fileName === 'jsc-bundle' && lineNumber !== null) {
      return getOriginalPositionForConsumers(consumers.slice(1), correctJSCLineNumber(lineNumber), correctJSCColumnNumber(columnNumber))
        .map(pos => (!pos ? (functionName || '').trim() : `at ${pos.name} (${pos.source} (${pos.line}:${pos.column}))`))
        .join('\n or ');
    }

    return (functionName || '').trim();
  }).join('\n');
}

function loadUri(p) {
  return loader.load(p).then(JSON.parse).then(ctn => (new sourceMap.SourceMapConsumer(ctn)));
}

function resolve(jsfmPath, bundlePath, ex) {
  const bundlePaths = [];

  if (/\.zip$/.test(bundlePath)) {
    const bundleDir = './.bundle_maps';

    shell.rm('-rf', bundleDir);
    shell.exec(`unzip ${bundlePath} -d ${bundleDir}`);

    fs.readdirSync(bundleDir).forEach((file) => {
      bundlePaths.push(path.join(bundleDir, file));
    });
  } else {
    bundlePaths.push(bundlePath);
  }

  const loadUrisPromise = [jsfmPath].concat(bundlePaths).map(p => loadUri(p));

  Promise
    .all(loadUrisPromise)
    .then(consumers => console.log(parseException(consumers, ex)))
    .catch(err => console.log(err));
}

module.exports = {
  resolve,
};
