/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const forge = require('node-forge');
forge.options.usePureJavaScript = true;
const { exportCertificate, exportPrivateKey } = require('../../libs/pkcs12');

const builder = (yargs) => {
  yargs
    .options({
      password: {
        alias: 'p',
        description: 'Password of the PKCS#12 file.',
      },
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
    process.stdout.write(`Reading ${options.inputFile} ...\n`);
  }

  if (options.privateKey) {
    exportPrivateKey(options.inputFile, options.password, options.alias, options);
  } else {
    exportCertificate(options.inputFile, options.password, options.alias, options);
  }
};

module.exports = {
  command: 'export <input-file> <alias>',
  description: 'Export certificate or private key from PKCS#12 file',
  builder,
  handler,
};
