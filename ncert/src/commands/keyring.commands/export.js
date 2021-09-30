/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const { exportCertificate, exportPrivateKey } = require('../../libs/keyring');

const builder = (yargs) => {
  yargs
    .options({
      'private-key': {
        alias: 'k',
        description: 'Export private key of the certificate instead of certificate itself.',
        default: false,
        type: 'boolean',
      },
      'output-file': {
        alias: 'f',
        description: 'Export to this file.',
      },
    });
};

const handler = async (options) => {
  if (options.verbose) {
    process.stdout.write(`Reading safkeyring:////${options.owner}/${options.keyring} ...\n`);
  }

  if (options.privateKey) {
    exportPrivateKey(options.owner, options.keyring, options.label, options);
  } else {
    exportCertificate(options.owner, options.keyring, options.label, options);
  }
};

module.exports = {
  command: 'export <owner> <keyring> <label>',
  description: 'Export certificate or private key from z/OS Keyring',
  builder,
  handler,
};
