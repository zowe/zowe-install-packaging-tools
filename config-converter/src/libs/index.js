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

const simpleReadYaml = (file) => {
  return YAML.parse(fs.readFileSync(file).toString());
}

const simpleReadJson = (file) => {
  return JSON.parse(fs.readFileSync(file).toString());
}

module.exports = {
  simpleReadYaml,
  simpleReadJson,
};
