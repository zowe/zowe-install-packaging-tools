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
const { generateCsr, signCsr, saveCertificate } = require('../../libs/pkcs12');
const { DEFAULT_JSON_INDENT } = require('../../constants');

const builder = (yargs) => {
  yargs
    .options({
      'output-file': {
        alias: 'f',
        description: 'PKCS#12 file to write.',
      },
      password: {
        alias: 'p',
        description: 'Password of the PKCS#12 file.',
      },
      'key-size': {
        alias: 'ks',
        default: 2048,
        description: 'RSA key size',
      },
      'common-name': {
        alias: 'cn',
        default: 'Zowe Service',
        description: 'Certificate subject common name',
      },
      organization: {
        alias: 'o',
        default: 'Zowe Sample',
        description: 'Certificate subject organization name',
      },
      'organization-unit': {
        alias: 'ou',
        default: 'API Mediation Layer',
        description: 'Certificate subject organization unit name',
      },
      country: {
        alias: 'c',
        default: 'CZ',
        description: 'Certificate subject country name',
      },
      state: {
        alias: 'st',
        default: 'Prague',
        description: 'Certificate subject state or province name',
      },
      locality: {
        alias: 'l',
        default: 'Prague',
        description: 'Certificate subject locality name',
      },
      'alt-name': {
        alias: 'alt',
        description: 'Certificate subject alt names',
        type: 'array',
      },
      validity: {
        default: 3650,
        description: 'How many days until the certificate will expire',
      },
      'serial-number': {
        description: 'Certificate serial number',
      },
      'ca-file': {
        alias: 'ca',
        description: 'PKCS#12 file where holds the certificate authority to sign the new certificate',
      },
      'ca-password': {
        alias: 'cap',
        description: 'Password of the certificate authority PKCS#12 file',
      },
      'ca-alias': {
        alias: 'caa',
        description: 'Certificate authority alias in the PKCS#12 file',
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
    process.stdout.write(`Generating certificate request ...\n`);
  }
  const [csr, key] = generateCsr(options);
  if (options.verbose) {
    process.stdout.write(`CSR generated:\n${forge.pki.certificationRequestToPem(csr)}\n`);
  }

  const cert = signCsr(csr, options);
  if (options.verbose) {
    process.stdout.write(`Certificate generated and signed:\n${forge.pki.certificateToPem(cert)}\n`);
  }

  if (options.verbose) {
    process.stdout.write(`Write certificate to ${options.outputFile}\n`);
  }
  saveCertificate(options.outputFile, options.password, cert, key, options.alias, options);
  process.stdout.write(`${options.outputFile} created.\n`);
};

module.exports = {
  command: 'generate <alias>',
  description: 'Generate a new certificate and sign with certificate authority.',
  builder,
  handler,
};
