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
const { formatSubject, readCertificates } = require('../../libs/pkcs12');
const { DEFAULT_JSON_INDENT } = require('../../constants');

const builder = (yargs) => {
  yargs
    .options({
      password: {
        alias: 'p',
        description: 'Password of the PKCS#12 file.',
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
    process.stdout.write(`Reading ${options.inputFile} ...\n`);
  }

  const result = readCertificates(options.inputFile, options.password, options);

  if (options.json) {
    process.stdout.write(JSON.stringify(result.formatted, null, DEFAULT_JSON_INDENT) + '\n');
  } else {
    if (options.verbose) {
      process.stdout.write(`Certificate raw data: ${JSON.stringify(result.raw)}\n`);
      process.stdout.write(`Certificate formatted: ${JSON.stringify(result.formatted)}\n`);
      process.stdout.write('\n');
    }

    for (const cert of result.formatted) {
      process.stdout.write('===============================================================\n');

      process.stdout.write(`Certificate: ${cert.friendlyName}\n`);
      process.stdout.write(`Version: ${cert.version}\n`);
      process.stdout.write(`Serial Number: ${cert.serialNumber}\n`);
      process.stdout.write(`Validity: ${cert.validity.notBefore} --> ${cert.validity.notAfter}\n`);
      process.stdout.write(`Issuer: ${formatSubject(cert.issuer)}\n`);
      process.stdout.write(`Subject: ${formatSubject(cert.subject)}\n`);
      process.stdout.write('Extensions:\n')
      if (cert.extensions && cert.extensions.subjectKeyIdentifier) {
        process.stdout.write(`- Subject Key Identifier: ${forge.util.bytesToHex(cert.extensions.subjectKeyIdentifier)}\n`);
      }
      if (cert.extensions && cert.extensions.authorityKeyIdentifier) {
        process.stdout.write(`- Authority Key Identifier: ${forge.util.bytesToHex(cert.extensions.authorityKeyIdentifier)}\n`);
      }
      if (cert.extensions && cert.extensions.keyUsage) {
        process.stdout.write(`- Key Usage: ${cert.extensions.keyUsage.join(', ')}\n`);
      }
      if (cert.extensions && cert.extensions.extKeyUsage) {
        process.stdout.write(`- Extended Key Usage: ${cert.extensions.extKeyUsage.join(', ')}\n`);
      }
      if (cert.extensions && cert.extensions.subjectAltName) {
        process.stdout.write(`- Subject Alt Name (DNS): ${cert.extensions.subjectAltName.dns.join(', ')}\n`);
        process.stdout.write(`- Subject Alt Name (IP): ${cert.extensions.subjectAltName.ip.join(', ')}\n`);
      }
      process.stdout.write(`Private Key: ${cert.privateKey ? 'YES' : 'NO'}\n`)
      
      process.stdout.write('\n');
    }
  }
};

module.exports = {
  command: 'info <input-file>',
  description: 'Display certificate information from PKCS#12 file',
  builder,
  handler,
};
