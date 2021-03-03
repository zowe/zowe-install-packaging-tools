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
const YAML = require('yaml');
const _ = require('lodash');
const { VERBOSE_ENV, DEFAULT_YAML_INDENT } = require('../constants');
const { INSTANCE_ENV_VAR_MAPPING } = require('../constants/instance-env-mapping');

// convert instance.env object to YAML config object
const convertToYamlConfig = (envs) => {
  try {
    const yamlConfig = {};

    for (const k in envs) {
      if (_.has(INSTANCE_ENV_VAR_MAPPING, k)) {
        if (_.isArray(INSTANCE_ENV_VAR_MAPPING[k])) {
          INSTANCE_ENV_VAR_MAPPING[k].forEach((mv) => {
            _.set(yamlConfig, mv, envs[k]);
          });
        } else if (INSTANCE_ENV_VAR_MAPPING[k] === false) {
          // ignore
          if (process.env[VERBOSE_ENV]) {
            process.stdout.write(util.format('Ignore key %s with value %j\n', k, envs[k]));
          }
        } else if (_.isFunction(INSTANCE_ENV_VAR_MAPPING[k])) {
          INSTANCE_ENV_VAR_MAPPING[k](envs[k], envs, yamlConfig);
        } else {
          _.set(yamlConfig, INSTANCE_ENV_VAR_MAPPING[k], envs[k]);
        }
      } else {
        if (process.env[VERBOSE_ENV]) {
          process.stdout.write(util.format('Unknown key %s with value %j\n', k, envs[k]));
        }
        _.set(yamlConfig, `zowe.environments[${k}]`, envs[k]);
      }
    }

    return yamlConfig;
  } catch (e) {
    throw new Error(`Error converting to YAML format: ${e.message}`);
  }
};

// write object as YAML format
const writeYaml = (data) => {
  try {
    let content;
    content = YAML.stringify(data, {
      indent: DEFAULT_YAML_INDENT,
    });
    process.stdout.write(content);
  } catch (e) {
    throw new Error(`Error writing to YAML format: ${e.message}`);
  }
};

module.exports = {
  convertToYamlConfig,
  writeYaml,
};
