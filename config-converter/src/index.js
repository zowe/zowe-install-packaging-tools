/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const util = require('util');
const _ = require('lodash');

const {
  readEnvFile,
  loadCertificateEnv,
  convertToYamlConfig,
  writeYaml,
} = require('./utils');
const { VERBOSE_ENV } = require('./constants');

//==============================================================================
// define cli options
const argv = require('yargs')
  .usage('Usage: $0 <instance-env-file>')
  .options({
    'verbose': {
      alias: 'v',
      type: 'boolean',
      description: 'Run with verbose logging'
    }
  })
  .help('h')
  .alias('h', 'help')
  .demand(1)
  .argv

//==============================================================================
// get input parameters
const instanceEnvFile = argv && argv['_'] && argv['_'][0];
process.env[VERBOSE_ENV] = argv.verbose ? '1' : '';

if (process.env[VERBOSE_ENV]) {
  process.stdout.write(util.format('CLI arguments: %j\n', argv));
  process.stdout.write(util.format('Converting: %s\n', instanceEnvFile));
}

//==============================================================================
// convert file
const envs = readEnvFile(instanceEnvFile);
if (envs['KEYSTORE_DIRECTORY']) {
  _.merge(envs, loadCertificateEnv(envs['KEYSTORE_DIRECTORY']));
}
// envs['ZWE_LAUNCH_COMPONENTS'] = '';
// envs['LAUNCH_COMPONENT_GROUPS'] = 'DESKTOP,GATEWAY';
// envs['ZWE_EXTERNAL_HOSTS'] = 'aaa.com,bbb.com';
const yamlConfig = convertToYamlConfig(envs);
if (process.env[VERBOSE_ENV]) {
  process.stdout.write('\n========== Converted YAML configuration ==========\n');
}
writeYaml(yamlConfig);
