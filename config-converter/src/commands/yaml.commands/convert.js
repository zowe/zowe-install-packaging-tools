/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const { readYaml, convertConfigs } = require('../../libs/yaml');

const builder = (yargs) => {
  yargs
    .options({
      workspaceDir: {
        alias: 'wd',
        description: 'Path to workspace directory.',
      },
    });
};

const handler = async (options) => {
  if (options.verbose) {
    process.stdout.write(`Reading ${options.yamlFile} ...\n`);
  }
  const result = readYaml(options.yamlFile);
  if (options.verbose) {
    process.stdout.write(`Converting ${options.yamlFile} ...\n`);
  }
  convertConfigs(result, options.workspaceDir);
};

module.exports = {
  command: 'convert [options] <yaml-file>',
  description: 'Convert Zowe YAML configuration and save to workspace directory',
  builder,
  handler,
};
