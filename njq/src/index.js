/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2020
 */

const util = require('util');
const fs = require('fs');
const { executeScript } = require('@elastic/micro-jq');

const STDIN_FILENO = 0;

//==============================================================================
const exitWithError = (message) => {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
};
const writeValue = (val, varName, raw) => {
  return (varName ? varName + '=' : '') +
    (
      raw && typeof val === 'string' ?
        val : 
        (val === undefined ? 'null' : JSON.stringify(val))
    );
};

//==============================================================================
// define cli options
const argv = require('yargs')
  .usage('Usage: $0 [options] <jq-filter-1> [<jq-filter-n>...]')
  .options({
    'input': {
      alias: 'i',
      type: 'string',
      default: '',
      description: 'input file'
    },
    'raw': {
      alias: 'r',
      type: 'boolean',
      description: 'output raw strings, not JSON texts'
    },
    'verbose': {
      alias: 'v',
      type: 'boolean',
      description: 'Run with verbose logging'
    }
  })
  .help('h')
  .alias('h', 'help')
  .demand(1)
  .argv

if (argv.verbose) {
  process.stdout.write(util.format('CLI arguments: %j\n', argv));
}

//==============================================================================
// validate input parameters
const filters = argv && argv['_'];
const inputFile = argv.input || '';
if (argv.verbose) {
  process.stdout.write(util.format('Parse %s with jq filter(s): %j\n', inputFile || 'stdin', filters));
}

//==============================================================================
// parse JSOn with jq filter(s)
try {
  for (const oneJq of filters) {
    let filter = '';
    let varName = '';
    const rem = oneJq.match(/^<([^>]+)>(.+)/);
    if (rem) {
      filter = rem[2];
      varName = rem[1];
    } else {
      filter = oneJq;
    }
    const data = JSON.parse(fs.readFileSync(inputFile || STDIN_FILENO));
    const result = executeScript(data, filter);

    if (Array.isArray(result)) {
      for (const one of result) {
        process.stdout.write(writeValue(one, varName, argv.raw) + '\n');
      }
    } else {
      process.stdout.write(writeValue(result, varName, argv.raw) + '\n');
    }
  }
} catch (e) {
  if (argv.verbose) {
    process.stderr.write('===================================\n');
    process.stderr.write(`Error stack: ${e.stack}\n`);
    process.stderr.write('===================================\n');
  }
  exitWithError(e.message);
}
