/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const { readCertificates } = require('../../libs/keyring');
const { DEFAULT_JSON_INDENT } = require('../../constants');

const builder = (yargs) => {
  yargs
    .options({
      label: {
        alias: 'l',
        description: 'Only show certificate with this label in the Keyring',
      },
      usage: {
        alias: 'u',
        description: 'Only show certificate with this usage in the Keyring',
      },
      'label-only': {
        description: 'Only output certificate label, nothing else',
        default: false,
        type: 'boolean',
      },
      'owner-only': {
        description: 'Only output certificate owner information, nothing else',
        default: false,
        type: 'boolean',
      },
      json: {
        description: 'Output as JSON format',
        default: false,
        type: 'boolean',
      },
    });
};

const handler = async (options) => {
  if (options.verbose) {
    process.stdout.write(`Reading safkeyring:////${options.owner}/${options.keyring} ...\n`);
  }

  const result = readCertificates(options.owner, options.keyring, options);

  if (options.json) {
    process.stdout.write(JSON.stringify(result.formatted, null, DEFAULT_JSON_INDENT) + '\n');
  } else {
    if (options.verbose) {
      process.stdout.write(`Certificates data: ${JSON.stringify(result.formatted)}\n`);
      process.stdout.write('\n');
    }

    for (const cert of result.formatted) {
      if (options.label && cert.label && cert.label !== options.label) {
        continue;
      }
      if (options.usage && cert.usage && cert.usage.toUpperCase() !== options.usage.toUpperCase()) {
        continue;
      }

      if (options.labelOnly) {
        process.stdout.write(`${cert.label}\n`);
      } else if (options.ownerOnly) {
        process.stdout.write(`${cert.owner}\n`);
      } else {
        process.stdout.write('===============================================================\n');

        process.stdout.write(`Certificate: ${cert.label}\n`);
        process.stdout.write(`Owner: ${cert.owner}\n`);
        process.stdout.write(`Usage: ${cert.usage}\n`);
        process.stdout.write(`Status: ${cert.status}\n`);
        process.stdout.write(`Default: ${cert.default ? 'YES' : 'NO'}\n`);

        process.stdout.write('\n');
      }
    }
  }
};

module.exports = {
  command: 'info <owner> <keyring>',
  description: 'Display certificates from z/OS Keyring',
  builder,
  handler,
};
