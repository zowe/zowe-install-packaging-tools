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
const forge = require('node-forge');
forge.options.usePureJavaScript = true;

const formatSubject = (obj) => {
  const result = [];
  for (const k in obj) {
    result.push(`${k}=${obj[k]}`);
  }
  return result.join(', ');
};

const readCertificates = (p12File, password) => {
  const p12Der = forge.util.createBuffer(fs.readFileSync(p12File), 'raw');
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
  const bags = p12.getBags({
    bagType: forge.pki.oids.certBag
  });
  const result = {
    raw: bags[forge.pki.oids.certBag],
    formatted: [],
  };

  for (const cert of bags[forge.pki.oids.certBag]) {
    const formattedCert = {
      friendlyName: cert.attributes.friendlyName,
      version: cert.cert.version,
      serialNumber: cert.cert.serialNumber,
      algorithm: cert.cert.md.algorithm,
      validity: {
        notBefore: cert.cert.validity.notBefore,
        notAfter: cert.cert.validity.notAfter,
      },
      issuer: {},
      subject: {},
      extensions: {},
    };

    for (const attr of cert.cert.issuer.attributes) {
      formattedCert.issuer[attr.shortName] = attr.value;
    }

    for (const attr of cert.cert.subject.attributes) {
      formattedCert.subject[attr.shortName] = attr.value;
    }

    for (const ext of cert.cert.extensions) {
      switch (ext.name) {
      case 'extKeyUsage':
        formattedCert.extensions[ext.name] = [];
        for (const k of ['clientAuth', 'serverAuth']) {
          if (ext[k]) {
            formattedCert.extensions[ext.name].push(k);
          }
        }
        break;
      case 'keyUsage':
        formattedCert.extensions[ext.name] = [];
        for (const k of ['digitalSignature', 'nonRepudiation', 'keyEncipherment', 'dataEncipherment', 'keyAgreement', 'keyCertSign', 'cRLSign', 'encipherOnly', 'decipherOnly']) {
          if (ext[k]) {
            formattedCert.extensions[ext.name].push(k);
          }
        }
        break;
      case 'subjectAltName':
        formattedCert.extensions[ext.name] = {
          dns: [],
          ip: [],
        }
        for (const alt of ext.altNames) {
          if (alt.type === 2) {
            formattedCert.extensions[ext.name].dns.push(alt.value);
          } else if (alt.type === 7) {
            formattedCert.extensions[ext.name].ip.push(alt.ip);
          }
        }
        break;
      default:
        formattedCert.extensions[ext.name] = ext.value;
      }
    }
    result.formatted.push(formattedCert);
  }

  return result;
};

module.exports = {
  formatSubject,
  readCertificates,
};
