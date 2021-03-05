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
const path = require('path');
const fs = require('fs');
const YAML = require('yaml');
const YAWN = require('yawn-yaml/cjs');
const _ = require('lodash');
const merge = require('deepmerge');
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

// Read Zowe YAML config and also process @include
const readYaml = (file) => {
  const baseFilePath = path.dirname(file);
  const data = YAML.parse(fs.readFileSync(file).toString());

  // @include is a special annotation which allows YAML to import another YAML file
  const recursivelyInclude = (obj) => {
    let result = null;
    if (Array.isArray(obj)) {
      result = [];
      for (const item of obj) {
        result.push(recursivelyInclude(item));
      }
    } else if (_.isObject(obj)) {
      result = {};
      for (const key in obj) {
        if (key === '@include') {
          const includeFilePath = path.resolve(baseFilePath, obj[key]);
          const includeData = YAML.parse(fs.readFileSync(includeFilePath).toString());
          result = merge(result, includeData);
        } else {
          result[key] = recursivelyInclude(obj[key]);
        }
      }
    } else {
      result = obj;
    }

    return result;
  };

  const processedData = recursivelyInclude(data);
  return processedData;
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

// update YAML file without losing format
const updateYaml = (yamlFile, objectPath, newValue) => {
  const yamlText = fs.readFileSync(yamlFile).toString();
  let yawn = new YAWN(yamlText);
  yawn.json = _.set(yawn.json, objectPath, newValue);
  fs.writeFileSync(yamlFile, yawn.yaml);
};

module.exports = {
  convertToYamlConfig,
  readYaml,
  writeYaml,
  updateYaml,
};
