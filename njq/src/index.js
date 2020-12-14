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

//==============================================================================
// define cli options
const argv = require('yargs')
  .usage('Usage: $0 [options] <jq-filter> [input-file]')
  .options({
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
const filter = (argv && argv['_'] && argv['_'][0]);
const inputFile = argv && argv['_'] && argv['_'][1];
if (argv.verbose) {
  process.stdout.write(util.format('Parse %s with jq filter: %j\n', inputFile || 'stdin', filter));
}

//==============================================================================
// parse JSOn with jq filter
try {
  const data = JSON.parse(fs.readFileSync(inputFile || STDIN_FILENO));
  const result = executeScript(data, filter);

  if (Array.isArray(result)) {
    for (const one of result) {
      console.log(argv.raw && typeof one === 'string' ? one : JSON.stringify(one));
    }
  } else {
    console.log(argv.raw && typeof result === 'string' ? result : (result === undefined ? 'null' : JSON.stringify(result)));
  }
} catch (e) {
  if (argv.verbose) {
    process.stderr.write('===================================\n');
    process.stderr.write(`Error stack: ${e.stack}\n`);
    process.stderr.write('===================================\n');
  }
  exitWithError(e.message);
}
