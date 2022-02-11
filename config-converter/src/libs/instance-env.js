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
const { spawnSync } = require("child_process");
const _ = require('lodash');

// convert output of "env" command to object
const readEnvOutput = (envOutput) => {
  const lines = envOutput.split(/\r|\n/);
  const envs = {};
  let isMultipleLine = false;
  let mlKey = '';
  lines.forEach((line) => {
    if (line === '') {
      return;
    }

    if (isMultipleLine) {
      if (line.substr(-1) === '"') {
        envs[mlKey] += '\n' + line.substr(0, line.length - 1);
        isMultipleLine = false;
        mlKey = '';
      } else {
        envs[mlKey] += '\n' + line;
      }
      return;
    }
    const equalChar = line.indexOf('=');
    if (equalChar <= 0) {
      // throw new Error(`Invalid env line: ${line}`)
    }
    const key = line.substr(0, equalChar);
    const val = line.substr(equalChar + 1);
    if (val.substr(0, 1) === '"') {
      mlKey = key;
      envs[mlKey] = val.substr(1);
    } else {
      envs[key] = val;
    }
  });

  return envs;
};

// read instance.env or zowe-certificates.env file
const readEnvFile = (file) => {
  try {
    const readOptions = { flag: 'r' };
    const content = fs.readFileSync(file, readOptions).toString();
    const lines = content.split(/\r|\n/);
    const keys = [];

    // fine all keys defined in instance.env
    // value is not easy to determine, will try to source it later
    lines.forEach((line) => {
      line = line.trim();

      if (line === '' || line.substr(0, 1) === '#') {
        return;
      }
      const equalChar = line.indexOf('=');
      if (equalChar <= 0) {
        return;
      }
      const key = line.substr(0, equalChar);
      keys.push(key);
    });

    // source instance.env and export all variables
    const result = spawnSync('/bin/sh', ['-c', `set -a && . ${file} && env`]);
    const sourcedEnvs = readEnvOutput(`${result.stdout}`);

    // cross check and find correct values of the env variables
    const finalEnvs = _.pick(sourcedEnvs, keys);

    return finalEnvs;
  } catch (e) {
    throw new Error(`Error reading file (${file}): ${e.message}`);
  }
};

// load certificate env variables
const loadCertificateEnv = (keystoreDir) => {
  try {
    const certEnvFile = `${keystoreDir}/zowe-certificates.env`;
    // should have zowe-certificates.env
    if (!fs.existsSync(certEnvFile)) {
      throw new Error(`Keystore directory "${keystoreDir}" doesn't have "zowe-certificates.env" file`);
    }

    return readEnvFile(certEnvFile);
  } catch (e) {
    throw new Error(`Error loading keystore configs: ${e.message}`);
  }
};

module.exports = {
  readEnvOutput,
  readEnvFile,
  loadCertificateEnv,
};
