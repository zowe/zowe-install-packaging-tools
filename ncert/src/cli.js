#!/usr/bin/env node

/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const util = require('util');
const { VERBOSE_ENV } = require('./constants');

// load tool version
const pkg = require('../package.json');
const version = pkg && pkg.version;

// parse arguments
const yargs = require('yargs');
yargs
  .version(version)
  .scriptName('zct') // zowe certificate tools
  .commandDir('commands')
  .demandCommand()
  .usage('Usage: $0 [options] <command> [command-options]')
  .options({
    verbose: {
      alias: 'v',
      default: false,
      description: 'Show more processing details.',
      type: 'boolean',
    }
  })
  .help()
  .alias('h', 'help')
  .middleware([(argv) => {
    process.env[VERBOSE_ENV] = argv.verbose ? '1' : '';
    if (argv.verbose) {
      process.stdout.write(util.format('CLI arguments: %j\n', argv));
    }
  }])
  .fail((msg, err) => {
    if (msg) {
      process.stderr.write(`${msg}\n`);
    }
    if (err) {
      if (err.stack && process.env[VERBOSE_ENV]) {
        process.stderr.write(`${err.stack}\n`);
      } else {
        process.stderr.write(`${err}\n`);
      }
    }
    process.stderr.write('Try --help to get usage information, or use --verbose option to display more details.\n');
    process.exit(1);
  })
  .parse();
