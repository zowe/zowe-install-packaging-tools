/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const _ = require('lodash');
const { convertToYamlConfig, writeYaml } = require('../../libs/yaml');
const { readEnvFile, loadCertificateEnv } = require('../../libs/instance-env');
const { STDOUT_YAML_SEPARATOR } = require('../../constants');

const builder = (yargs) => {
  yargs
    .options({
      // repository: {
      //   alias: 'repo',
      //   description: 'Repository name. List label(s) of this repository. Default value is the template repository.',
      //   group: 'Milestone Options',
      // },
    });
};

const handler = async (options) => {
  const envs = readEnvFile(options.instanceEnvFile);
  if (envs['KEYSTORE_DIRECTORY']) {
    _.merge(envs, loadCertificateEnv(envs['KEYSTORE_DIRECTORY']));
  }
  // envs['ZWE_LAUNCH_COMPONENTS'] = '';
  // envs['LAUNCH_COMPONENT_GROUPS'] = 'DESKTOP,GATEWAY';
  // envs['ZWE_EXTERNAL_HOSTS'] = 'aaa.com,bbb.com';
  const yamlConfig = convertToYamlConfig(envs);
  if (options.verbose) {
    process.stdout.write(`\n${STDOUT_YAML_SEPARATOR}\n`);
  }
  writeYaml(yamlConfig);
};

module.exports = {
  command: 'to-yaml <instance-env-file>',
  aliases: ['yml'],
  description: 'Convert instance.env to YAML format',
  builder,
  handler,
};
