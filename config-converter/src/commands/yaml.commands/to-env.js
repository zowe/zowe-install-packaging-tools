/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const { convertAllHAYamlsToEnv } = require('../../libs/yaml');

const builder = (yargs) => {
  yargs
    .options({});
};

const handler = async (options) => {
  if (options.verbose) {
    process.stdout.write(`Converting ${options.yamlFile} ...\n`);
  }
  convertAllHAYamlsToEnv(options.yamlFile);
};

module.exports = {
  command: 'to-env <yaml-file>',
  aliases: ['env'],
  description: 'Convert YAML configuration to instance env file',
  builder,
  handler,
};
