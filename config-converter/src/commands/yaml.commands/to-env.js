/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const { convertComponentYamlToEnv, convertAllComponentYamlsToEnv } = require('../../libs/yaml');
const { getSysname } = require('../../libs');

const builder = (yargs) => {
  yargs
    .options({
      workspaceDir: {
        alias: 'wd',
        description: 'Path to workspace directory.',
      },
      haInstanceId: {
        alias: 'ha',
        default: '',
        description: 'High-availability instance ID. Default value is &SYSNAME.',
      },
      componentId: {
        alias: 'c',
        default: '',
        description: 'Component ID. If leave it empty, the command will convert for all components in workspace directory.',
      }
    });
};

const handler = async (options) => {
  if (options.verbose) {
    if (options.componentId) {
      process.stdout.write(`Converting configurations for component ${options.componentId} of instance ${options.haInstanceId} ...\n`);
    } else {
      process.stdout.write(`Converting configurations for all components of instance ${options.haInstanceId} ...\n`);
    }
  }
  if (!options.haInstanceId) {
    options.haInstanceId = getSysname();
  }
  if (options.componentId) {
    convertComponentYamlToEnv(options.workspaceDir, options.haInstanceId, options.componentId);
  } else {
    convertAllComponentYamlsToEnv(options.workspaceDir, options.haInstanceId);
  }
};

module.exports = {
  command: 'to-env',
  aliases: ['env'],
  description: 'Convert YAML configuration to instance env file',
  builder,
  handler,
};
