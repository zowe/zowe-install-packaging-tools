/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const { readYaml } = require('../../libs/yaml');

const builder = (yargs) => {
  yargs
    .options({});
};

const handler = async (options) => {
  const result = readYaml(options.yamlFile);
  process.stdout.write(JSON.stringify(result, null, 2));
};

module.exports = {
  command: 'read <yaml-file>',
  description: 'Read YAML configuration',
  builder,
  handler,
};
