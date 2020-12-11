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
const YAML = require('yaml');

const DEFAULT_INDENT = 2;

//==============================================================================
const exitWithError = (message) => {
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  },
  isValidFormat = (format) => {
    return format === 'YAML' || format === 'JSON';
  },
  readInput = (input) => {
    try {
      const readOptions = { flag: 'r' };
      if (input.encoding) {
        readOptions.encoding = input.encoding;
      }
      const content = fs.readFileSync(input.file, readOptions).toString();
      let data;
      if (input.format === 'YAML') {
        data = YAML.parse(content);
      } else if (input.format === 'JSON') {
        data = JSON.parse(content);
      }
      return data;
    } catch (e) {
      exitWithError(`error reading input file: ${e.message}`);
    }
  },
  writeOutput = (data, output) => {
    try {
      let content;
      if (output.format === 'YAML') {
        content = YAML.stringify(data, {
          indent: DEFAULT_INDENT,
        });
      } else if (output.format === 'JSON') {
        content = JSON.stringify(data, null, DEFAULT_INDENT) + '\n';
      }
      if (output.file) {
        const writeOptions = {};
        if (output.encoding) {
          writeOptions.encoding = output.encoding;
        }
        fs.writeFileSync(output.file, content, writeOptions);
      } else {
        process.stdout.write(content);
      }
    } catch (e) {
      exitWithError(`error writing output file: ${e.message}`);
    }
  };

//==============================================================================
// define cli options
const argv = require('yargs')
  .usage('Usage: $0 [options] <input-file>')
  .options({
    'input-format': {
      type: 'string',
      default: '',
      description: 'YAML or JSON'
    },
    'input-encoding': {
      type: 'string',
      default: '',
      description: 'UTF8, ISO8859-1, Cp1047, ... - see https://goo.gl/yn2pJZ'
    },
    'output': {
      alias: 'o',
      type: 'string',
      default: '',
      description: 'Output file (default: print to console)'
    },
    'output-format': {
      type: 'string',
      default: '',
      description: 'YAML or JSON'
    },
    'output-encoding': {
      type: 'string',
      default: '',
      description: 'UTF8, ISO8859-1, Cp1047, ... - see https://goo.gl/yn2pJZ'
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
const input = {
  file: argv && argv['_'] && argv['_'][0],
  format: argv['input-format'].toUpperCase(),
  encoding: argv['input-encoding'],
};
const output = {
  file: argv['output'],
  format: argv['output-format'].toUpperCase(),
  encoding: argv['output-format']
};

if (!argv['input-format']) {
  // guess format from file extension
  const fileLc = input.file.toLowerCase();
  if (fileLc.endsWith('.yaml') || fileLc.endsWith('.yml')) {
    input.format = 'YAML';
  } else if (fileLc.endsWith('.json')) {
    input.format = 'JSON';
  }
}
if (!input.format) {
  exitWithError("cannot determine input file format. Please supply --input-format option");
}
if (!isValidFormat(input.format)) {
  exitWithError(`input format ${input.format} is not supported`);
}
if (!output.format) {
  output.format = input.format === 'YAML' ? 'JSON' : 'YAML';
}
if (!output.format) {
  exitWithError("cannot determine output file format. Please supply --output-format option");
}
if (!isValidFormat(output.format)) {
  exitWithError(`output format ${output.format} is not supported`);
}
if (argv.verbose) {
  process.stdout.write(util.format('Converting: %j => %j\n', input, output));
}

//==============================================================================
// convert file
writeOutput(readInput(input), output);
