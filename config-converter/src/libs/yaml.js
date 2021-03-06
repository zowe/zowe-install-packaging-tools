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
const { VERBOSE_ENV, DEFAULT_YAML_INDENT, DEFAULT_JSON_INDENT } = require('../constants');
const { ENV_TO_YAML_MAPPING } = require('../constants/env2yaml-map');
const { simpleReadJson, simpleReadYaml } = require('./index');
const { YAML_TO_ENV_MAPPING } = require('../constants/yaml2env-map');

// convert instance.env object to YAML config object
const convertToYamlConfig = (envs) => {
  try {
    const yamlConfig = {};

    for (const k in envs) {
      if (_.has(ENV_TO_YAML_MAPPING, k)) {
        if (_.isArray(ENV_TO_YAML_MAPPING[k])) {
          ENV_TO_YAML_MAPPING[k].forEach((mv) => {
            _.set(yamlConfig, mv, envs[k]);
          });
        } else if (ENV_TO_YAML_MAPPING[k] === false) {
          // ignore
          if (process.env[VERBOSE_ENV]) {
            process.stdout.write(util.format('Ignore key %s with value %j\n', k, envs[k]));
          }
        } else if (_.isFunction(ENV_TO_YAML_MAPPING[k])) {
          ENV_TO_YAML_MAPPING[k](envs[k], envs, yamlConfig);
        } else {
          _.set(yamlConfig, ENV_TO_YAML_MAPPING[k], envs[k]);
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
  const data = simpleReadYaml(file);

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
      const includes = [];
      for (const key in obj) {
        if (key === '@include') {
          includes.push(obj[key]);
        } else {
          result[key] = recursivelyInclude(obj[key]);
        }
      }
      for (const include of includes) {
        const includeFilePath = path.resolve(baseFilePath, include);
        const includeData = simpleReadYaml(includeFilePath);
        result = merge(result, includeData);
      }
    } else {
      result = obj;
    }

    return result;
  };

  const processedData = recursivelyInclude(data);
  return processedData;
};

// consider all overrides based on HA-Instance-ID, save the converted configs
const convertConfigs = (configObj, workspaceDir = null) => {
  workspaceDir = workspaceDir ? workspaceDir : process.env.WORKSPACE_DIR;
  if (!workspaceDir) {
    throw new Error('Environment WORKSPACE_DIR is required');
  }

  const configObjCopy = merge({}, configObj);

  // find components
  const components = fs.readdirSync(workspaceDir).filter(file => {
    return fs.statSync(path.resolve(workspaceDir, file)).isDirectory();
  });
  if (process.env[VERBOSE_ENV]) {
    process.stdout.write(`- found ${components.length} components\n`);
  }
  // apply components configs as default values
  components.forEach(component => {
    if (!fs.existsSync(path.resolve(workspaceDir, component, '.manifest.json'))) {
      if (process.env[VERBOSE_ENV]) {
        process.stdout.write(`  - component ${component} doesn't have manifest\n`);
      }
      return;
    }
    if (process.env[VERBOSE_ENV]) {
      process.stdout.write(`  - read ${component} manifest\n`);
    }
    const manifest = simpleReadJson(path.resolve(workspaceDir, component, '.manifest.json'));
    if (manifest.configs) {
      if (!configObjCopy.components) {
        configObjCopy.components = {};
      }
      configObjCopy.components[component] = _.defaultsDeep(configObjCopy.components[component] || {}, manifest.configs);
    }
  });

  // write workspace/.zowe.yaml
  if (process.env[VERBOSE_ENV]) {
    process.stdout.write(`- write <workspace-dir>/.zowe.yaml\n`);
  }
  writeYaml(configObjCopy, path.resolve(workspaceDir, '.zowe.yaml'));

  // write workspace/.zowe-<ha-id>.yaml
  const haInstanceIds = configObjCopy.haInstances ? _.keys(configObjCopy.haInstances) : ['default'];
  const haCopy = _.omit(merge({}, configObjCopy), ['haInstances']);
  if (process.env[VERBOSE_ENV]) {
    process.stdout.write(`- found ${haInstanceIds.length} HA instance(s)\n`);
  }
  haInstanceIds.forEach(haInstance => {
    const haCopyMerged = merge(haCopy, configObjCopy.haInstances && configObjCopy.haInstances[haInstance] || {});
    if (process.env[VERBOSE_ENV]) {
      process.stdout.write(`  - write <workspace-dir>/.zowe-${haInstance}.yaml\n`);
    }
    writeYaml(haCopyMerged, path.resolve(workspaceDir, `.zowe-${haInstance}.yaml`));

    // write component configurations
    components.forEach(component => {
      if (haCopyMerged.components && haCopyMerged.components[component]) {
        if (process.env[VERBOSE_ENV]) {
          process.stdout.write(`    - write <workspace-dir>/${component}/.configs-${haInstance}.json\n`);
        }
        writeJson(haCopyMerged.components[component], path.resolve(workspaceDir, component, `.configs-${haInstance}.json`));
        // if (process.env[VERBOSE_ENV]) {
        //   process.stdout.write(`    - write <workspace-dir>/${component}/.configs-${haInstance}.yaml\n`);
        // }
        // writeYaml(haCopyMerged.components[component], path.resolve(workspaceDir, component, `.configs-${haInstance}.yaml`));
      }
    });
  });
};

// convert one YAML config to old instance.env format
const convertYamlToEnv = (zoweYaml, instanceEnv) => {
  const configObj = simpleReadYaml(zoweYaml);
  const zoweYamlBaseName = path.basename(zoweYaml);
  const envContent = ['#!/bin/sh', ''];
  const escapeEnvValue = (val) => {
    val = `${val}`;
    if (val.indexOf('"') > -1) {
      return `"${val.replace('"', '\\"')}"`;
    } else {
      return val;
    }
  };
  const pushKeyValue = (key, val) => {
    envContent.push([key, escapeEnvValue(val)].join('='));
  };

  for (const key in YAML_TO_ENV_MAPPING) {
    if (YAML_TO_ENV_MAPPING[key] === false) {
      continue;
    } else if (_.isString(YAML_TO_ENV_MAPPING[key])) {
      const val = _.get(configObj, YAML_TO_ENV_MAPPING[key]);
      if (!_.isUndefined(val)) {
        pushKeyValue(key, val);
      }
    } else if (_.isArray(YAML_TO_ENV_MAPPING[key])) {
      let lastVal = null;
      YAML_TO_ENV_MAPPING[key].forEach(k => {
        const thisVal = _.get(configObj, `${k}`);
        if (lastVal !== null && lastVal !== thisVal) {
          process.stderr.write(`WARNING: <workspace-dir>/${zoweYamlBaseName} value of ${k} is not same as other sibling configs\n`);
        }
        lastVal = thisVal;
      });
      if (lastVal !== null && !_.isUndefined(lastVal)) {
        pushKeyValue(key, lastVal);
      }
    } else if (_.isFunction(YAML_TO_ENV_MAPPING[key])) {
      const val = YAML_TO_ENV_MAPPING[key](zoweYamlBaseName, configObj);
      if (!_.isUndefined(val)) {
        pushKeyValue(key, val);
      }
    }
  }

  envContent.push('');
  envContent.push('# other environments kept as-is');
  if (configObj && configObj.zowe && configObj.zowe.environments) {
    for (const key in configObj.zowe.environments) {
      pushKeyValue(key, configObj.zowe.environments[key]);
    }
  }

  fs.writeFileSync(instanceEnv, envContent.join('\n') + '\n');
};

// convert YAML configs of all HA instances to old instance.env format
const convertAllHAYamlsToEnv = (zoweYaml) => {
  const workspaceDir = path.dirname(zoweYaml);
  const configObj = simpleReadYaml(zoweYaml);
  const haInstanceIds = configObj.haInstances ? _.keys(configObj.haInstances) : ['default'];
  if (process.env[VERBOSE_ENV]) {
    process.stdout.write(`- found ${haInstanceIds.length} HA instance(s)\n`);
  }
  haInstanceIds.forEach(haInstance => {
    // should have <workspace-dir>/.zowe-<ha-id>.yaml
    const haZoweYaml = path.resolve(workspaceDir, `.zowe-${haInstance}.yaml`);
    const haInstanceEnv = path.resolve(workspaceDir, `.instance-${haInstance}.env`);
    if (fs.existsSync(haZoweYaml)) {
      if (process.env[VERBOSE_ENV]) {
        process.stdout.write(`  - write .instance-${haInstance}.env\n`);
      }
      convertYamlToEnv(haZoweYaml, haInstanceEnv);
    } else {
      process.stderr.write(`WARNING: <workspace-dir>/.zowe-${haInstance}.yaml doesn't exist\n`);
    }
  });
};

// write object as YAML format to console or a file
const writeYaml = (data, toFile = null) => {
  try {
    let content;
    content = YAML.stringify(data, {
      indent: DEFAULT_YAML_INDENT,
    });

    if (toFile) {
      fs.writeFileSync(toFile, content);
    } else {
      process.stdout.write(content);
    }
  } catch (e) {
    throw new Error(`Error writing to YAML format: ${e.message}`);
  }
};

// write object as JSON format to console or a file
const writeJson = (data, toFile = null) => {
  try {
    let content;
    content = JSON.stringify(data, null, DEFAULT_JSON_INDENT);

    if (toFile) {
      fs.writeFileSync(toFile, content);
    } else {
      process.stdout.write(content);
    }
  } catch (e) {
    throw new Error(`Error writing to JSON format: ${e.message}`);
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
  convertConfigs,
  convertAllHAYamlsToEnv,
  writeYaml,
  writeJson,
  updateYaml,
};
