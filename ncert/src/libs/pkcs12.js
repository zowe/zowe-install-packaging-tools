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

const generateSerialNumber = (seed) => {
  const md = forge.md.sha1.create();
  md.update(seed);
  return md.digest().toHex();
}

const loadPkcs12 = (p12File, password) => {
  const p12Der = forge.util.createBuffer(fs.readFileSync(p12File), 'raw');
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  return forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
};

/**
 * List all certificates in the PKCS#12 file
 * @param {*} p12File 
 * @param {*} password 
 * @param {*} options 
 * @returns 
 */
const readCertificates = (p12File, password) => {
  const p12 = loadPkcs12(p12File, password);
  const certs = p12.getBags({
    bagType: forge.pki.oids.certBag
  });
  const result = {
    raw: certs[forge.pki.oids.certBag],
    formatted: [],
  };

  for (const cert of certs[forge.pki.oids.certBag]) {
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
      privateKey: false,
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
        for (const k of ['clientAuth', 'serverAuth', 'codeSigning', 'emailProtection', 'timeStamping']) {
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

    if (cert.attributes.friendlyName && cert.attributes.friendlyName[0]) {
      // const keys = p12.getBags({
      //   friendlyName: cert.attributes.friendlyName && cert.attributes.friendlyName[0],
      //   bagType: forge.pki.oids.keyBag
      // });
      // if (keys.friendlyName && keys.friendlyName[0] && keys.friendlyName[0].key) {
      //   formattedCert.privateKey = true;
      // }
      const pkcs8ShroudedKeys = p12.getBags({
        friendlyName: cert.attributes.friendlyName && cert.attributes.friendlyName[0],
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag
      });
      if (pkcs8ShroudedKeys.friendlyName && pkcs8ShroudedKeys.friendlyName[0] && pkcs8ShroudedKeys.friendlyName[0].key) {
        formattedCert.privateKey = true;
      }
    }

    result.formatted.push(formattedCert);
  }

  return result;
};

/**
 * Create certificate signing request
 * @param {*} options 
 * @returns     array of csr object and private key
 */
const generateCsr = (options) => {
  // generate a key pair
  const pair = forge.pki.rsa.generateKeyPair(options.keySize || 2048);
 
  // create a certification request (CSR)
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = pair.publicKey;
  const subject = [];
  if (options.commonName) {
    subject.push({ shortName: 'CN', value: options.commonName });
  }
  if (options.organization) {
    subject.push({ shortName: 'O', value: options.organization });
  }
  if (options.organizationUnit) {
    subject.push({ shortName: 'OU', value: options.organizationUnit });
  }
  if (options.country) {
    subject.push({ shortName: 'C', value: options.country });
  }
  if (options.state) {
    subject.push({ shortName: 'ST', value: options.state });
  }
  if (options.locality) {
    subject.push({ shortName: 'L', value: options.locality });
  }
  csr.setSubject(subject);
  // set (optional) attributes
  const attrs = [];
  const exts = [];
  const altNames = [];
  if (options.altName && options.altName.length) {
    for (const one of [...new Set(options.altName)]) {
      if (one.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/)) {
        altNames.push({ type: 7, ip: one });
      } else if (one.match(/^https?:\/\/.+$/)) {
        altNames.push({ type: 6, value: one });
      } else {
        altNames.push({ type: 2, value: one });
      }
    }
    exts.push({
      name: 'subjectAltName',
      altNames: altNames,
    });
  }
  // FIXME: allow to customize usage
  exts.push({
    name: 'keyUsage',
    critical: true,
    // keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  });
  exts.push({
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
  });
  attrs.push({
    name: 'extensionRequest',
    extensions: exts,
  });
  csr.setAttributes(attrs);

  // sign certification request
  csr.sign(pair.privateKey);

  // verify certification request
  if (!csr.verify()) {
    throw new Error('CSR generated is invalid');
  }

  return [csr, pair.privateKey];
};

/**
 * Sign certificate signing request with specified CA
 * @param {*} csr
 * @param {*} options 
 * @returns   certificate object
 */
const signCsr = (csr, options) => {
  if (!options.caFile) {
    throw new Error('Certificate authority is required to sign the new certificate');
  }
  if (!options.caAlias) {
    throw new Error('Certificate authority alias is required to sign the new certificate');
  }
  const p12 = loadPkcs12(options.caFile, options.caPassword);
  const ca = p12.getBags({
    friendlyName: options.caAlias,
    // bagType: forge.pki.oids.pkcs8ShroudedKeyBag
  });
  if (!ca.friendlyName) {
    throw new Error('Failed to find certificate authority');
  }

  var caCert, caKey;
  for (const one of ca.friendlyName) {
    if (one.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
      caKey = one.key;
    } else if (one.type === forge.pki.oids.certBag) {
      caCert = one.cert;
    }
  }
  if (!caCert || !caKey) {
    throw new Error('Failed to find certificate authority cert or key');
  }
  const caSubjectKeyIdentifierObj = caCert.getExtension('subjectKeyIdentifier');
  const caSubjectKeyIdentifier = caSubjectKeyIdentifierObj && caSubjectKeyIdentifierObj.value;
  if (!caSubjectKeyIdentifier) {
    throw new Error('Failed to find certificate authority subject key identifier');
  }

  const cert = forge.pki.createCertificate();
  cert.serialNumber = options.serialNumber || generateSerialNumber(`${new Date()} - ${JSON.stringify(csr.getAttribute({name: 'extensionRequest'}).extensions)}`);

  cert.publicKey = csr.publicKey;

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + options.validity);

  // set subject from CSR
  cert.setSubject(csr.subject.attributes);
  // set issuer from CA
  cert.setIssuer(caCert.subject.attributes);
  // set extensions from CSR
  const extensions = csr.getAttribute({name: 'extensionRequest'}).extensions;
  extensions.push({
    name: 'subjectKeyIdentifier'
  });
  extensions.push({
    name: 'authorityKeyIdentifier',
    // somehow node-forge will prefix few characters on top of caSubjectKeyIdentifier and make it invalid
    // keyIdentifier: caSubjectKeyIdentifier,
    // linking with serial number works well
    authorityCertIssuer: true,
    serialNumber: caCert.serialNumber
  });
  cert.setExtensions(extensions);

  // signs a certificate using SHA-256 instead of SHA-1
  cert.sign(caKey, forge.md.sha256.create());

  return cert;
};

/**
 * Add new certificate to PKCS#12 file
 * @param {*} p12File 
 * @param {*} password 
 * @param {*} ceert 
 * @param {*} options 
 */
const saveCertificate = (p12File, password, cert, key, alias) => {
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(key, [cert], password, {
    generateLocalKeyId: true,
    friendlyName: alias,
    algorithm: '3des'
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  fs.writeFileSync(p12File, Buffer.from(p12Der, 'binary'));
};

const exportCertificate = (p12File, password, alias, options) => {
  const p12 = loadPkcs12(p12File, password);
  const bag = p12.getBags({
    friendlyName: alias,
    bagType: forge.pki.oids.certBag
  });
  const cert = bag && bag.friendlyName && bag.friendlyName[0] && bag.friendlyName[0].cert;
  if (!cert) {
    throw new Error(`Cannot find certificate ${alias} in ${p12File}`);
  }

  if (options.verbose) {
    process.stdout.write(`Certificate found: ${JSON.stringify(cert)}\n\n`);
  }

  const result = forge.pki.certificateToPem(cert);
  if (options.outputFile) {
    fs.writeFileSync(options.outputFile, result);
  } else {
    process.stdout.write(`${result}\n`);
  }
};

const exportPrivateKey = (p12File, password, alias, options) => {
  const p12 = loadPkcs12(p12File, password);
  const bag = p12.getBags({
    friendlyName: alias,
    bagType: forge.pki.oids.pkcs8ShroudedKeyBag
  });
  const key = bag && bag.friendlyName && bag.friendlyName[0] && bag.friendlyName[0].key;
  if (!key) {
    throw new Error(`Cannot find private key ${alias} in ${p12File}`);
  }

  if (options.verbose) {
    process.stdout.write(`Private key found: ${JSON.stringify(key)}\n\n`);
  }

  const result = forge.pki.privateKeyToPem(key);
  if (options.outputFile) {
    fs.writeFileSync(options.outputFile, result);
  } else {
    process.stdout.write(`${result}\n`);
  }
};

module.exports = {
  formatSubject,
  readCertificates,
  generateCsr,
  signCsr,
  saveCertificate,
  exportCertificate,
  exportPrivateKey,
};

// merge 2 keystores
// keytool -v -importkeystore -srckeystore localhost/localhost-new.keystore.p12 -srcstoretype PKCS12 -srcstorepass password -keypass password -destkeystore localhost/localhost.keystore.p12 -deststoretype PKCS12 -deststorepass password
