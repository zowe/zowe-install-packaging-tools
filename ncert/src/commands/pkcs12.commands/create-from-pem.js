/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2022
 */

const fs = require('fs');
const forge = require('node-forge');
forge.options.usePureJavaScript = true;
const { saveCertificate } = require('../../libs/pkcs12');

const builder = (yargs) => {
  yargs
    .options({
      'output-file': {
        alias: 'f',
        description: 'PKCS#12 file to create.',
      },
      password: {
        alias: 'p',
        description: 'Password of the PKCS#12 file.',
      },
      'certificate': {
        alias: 'cert',
        description: 'PEM file of the certificate.',
      },
      'private-key': {
        alias: 'key',
        description: 'PEM file of the private key.',
      },
    });
};

const handler = async (options) => {
  if (options.verbose) {
    process.stdout.write(`Create PKCS#12 keystore from certificate and private key in PEM format ...\n`);
  }
  const certPem = fs.readFileSync(options.certificate).toString();
  const cert = forge.pki.certificateFromPem(certPem);
  const keyPem = fs.readFileSync(options.privateKey).toString();
  const key = forge.pki.privateKeyFromPem(keyPem);

  if (options.verbose) {
    process.stdout.write(`Certificate will be imported:\n${forge.pki.certificateToPem(cert)}\n`);
    process.stdout.write(`Private key:\n${forge.pki.privateKeyToPem(key)}\n`);
  }

  if (options.verbose) {
    process.stdout.write(`Write certificate to ${options.outputFile}\n`);
  }
  saveCertificate(options.outputFile, options.password, cert, key, options.alias, options);
  process.stdout.write(`${options.outputFile} created.\n`);
};

module.exports = {
  command: 'create-from-pem <alias>',
  description: 'Create PKCS#12 keystore from certificate and private key in PEM format.',
  builder,
  handler,
};
