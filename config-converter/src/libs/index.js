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
const YAML = require('yaml');
const { execSync } = require("child_process");
const { DEFAULT_HA_INSTANCE_ID } = require('../constants');

const simpleReadYaml = (file) => {
  return YAML.parse(fs.readFileSync(file).toString());
};

const simpleReadJson = (file) => {
  return JSON.parse(fs.readFileSync(file).toString());
};

const getSysname = () => {
  let sysname = DEFAULT_HA_INSTANCE_ID;
  try {
    const out = execSync("sysvar SYSNAME 2>/dev/null");
    sysname = out.toString().toLowerCase().trim();
  } catch (e1) {
    // ignore error
    try {
      const out = execSync("hostname -s 2>/dev/null");
      sysname = out.toString().toLowerCase().trim();
    } catch (e2) {
      // ignore error
    }
  }

  return sysname;
};

module.exports = {
  simpleReadYaml,
  simpleReadJson,
  getSysname,
};
