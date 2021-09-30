/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const fs = require('fs');
const KEYRING = require('keyring_js');

const readCertificates = (owner, keyring) => {
  const results = KEYRING.listKeyring(owner, keyring);
  return {
    raw: results,
    formatted: results,
  };
};

const exportCertificate = (owner, keyring, label, options) => {
  const pem = KEYRING.getPemEncodedData(owner, keyring, label);
  if (!pem || !pem.certificate) {
    throw new Error(`Cannot find certificate ${label} in safkeyring:////${owner}/${keyring}`);
  }

  if (options.verbose) {
    process.stdout.write(`Certificate found: ${JSON.stringify(pem.certificate)}\n\n`);
  }

  if (options.outputFile) {
    fs.writeFileSync(options.outputFile, pem.certificate);
  } else {
    process.stdout.write(`${pem.certificate}\n`);
  }
};

const exportPrivateKey = (owner, keyring, label, options) => {
  const pem = KEYRING.getPemEncodedData(owner, keyring, label);
  if (!pem || !pem.key || pem.key === "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----" ) {
    throw new Error(`Cannot find private key ${label} in safkeyring:////${owner}/${keyring}`);
  }

  if (options.verbose) {
    process.stdout.write(`Private key found: ${JSON.stringify(pem.key)}\n\n`);
  }

  if (options.outputFile) {
    fs.writeFileSync(options.outputFile, pem.key);
  } else {
    process.stdout.write(`${pem.key}\n`);
  }
};

module.exports = {
  readCertificates,
  exportCertificate,
  exportPrivateKey,
};
