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
const { VERBOSE_ENV, DEFAULT_YAML_INDENT, DEFAULT_JSON_INDENT, DEFAULT_NEW_FILE_MODE } = require('../constants');
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
const convertConfigs = (configObj, haInstance, workspaceDir = null) => {
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
  // FIXME: will we have issue of competing write with multiple ha instance starting at same time?
  //        but anyway this file is for reference purpose (showing how @include are handled), no
  //        real usage on runtime.
  writeYaml(configObjCopy, path.resolve(workspaceDir, '.zowe.yaml'));

  // prepare haInstance.id, haInstance.hostname and haInstance.ip
  if (process.env[VERBOSE_ENV]) {
    process.stdout.write(`- process HA instance "${haInstance}"\n`);
  }
  const haCopy = merge({}, configObjCopy);
  const haCopyMerged = merge(haCopy, _.omit(configObjCopy.haInstances && configObjCopy.haInstances[haInstance] || {}, ['id', 'hostname', 'ip']));
  _.set(haCopyMerged, 'haInstance.id', haInstance);
  _.set(haCopyMerged, 'haInstance.hostname', 
    (
      (configObjCopy.haInstances && configObjCopy.haInstances[haInstance] && configObjCopy.haInstances[haInstance].hostname) || 
      (configObjCopy.zowe && configObjCopy.zowe.externalDomains && configObjCopy.zowe.externalDomains[0]) ||
      ''
    )
  );
  _.set(haCopyMerged, 'haInstance.ip', 
    (
      (configObjCopy.haInstances && configObjCopy.haInstances[haInstance] && configObjCopy.haInstances[haInstance].ip) || 
      (configObjCopy.zowe && configObjCopy.zowe.environments && configObjCopy.zowe.environments['ZOWE_IP_ADDRESS']) ||
      ''
    )
  );
  writeJson(haCopyMerged, path.resolve(workspaceDir, `.zowe-${haInstance}.json`));

  // prepare component configs and write component configurations
  // IMPORTANT: these configs will be used to generate component runtime environment
  components.forEach(component => {
    if (haCopyMerged.components && haCopyMerged.components[component]) {
      const componentCopy = merge({}, haCopyMerged);
      _.set(componentCopy, 'configs', haCopyMerged.components[component]);

      if (process.env[VERBOSE_ENV]) {
        process.stdout.write(`    - write <workspace-dir>/${component}/.configs-${haInstance}.json\n`);
      }
      writeJson(componentCopy, path.resolve(workspaceDir, component, `.configs-${haInstance}.json`));
      // if (process.env[VERBOSE_ENV]) {
      //   process.stdout.write(`    - write <workspace-dir>/${component}/.configs-${haInstance}.yaml\n`);
      // }
      // writeYaml(componentCopy, path.resolve(workspaceDir, component, `.configs-${haInstance}.yaml`));
    }
  });
};

// convert Zowe YAML config to old instance.env format
const convertZoweYamlToEnv = (workspaceDir, haInstance, yamlConfigFile, instanceEnvFile) => {
  workspaceDir = workspaceDir ? workspaceDir : process.env.WORKSPACE_DIR;
  if (!workspaceDir) {
    throw new Error('Environment WORKSPACE_DIR is required');
  }

  // should have <workspace-dir>/<component-id>/.configs-<ha-id>.json
  const haComponentConfig = path.resolve(workspaceDir, yamlConfigFile);
  const haInstanceEnv = path.resolve(workspaceDir, instanceEnvFile);
  if (!fs.existsSync(haComponentConfig)) {
    process.stderr.write(`WARNING: <workspace-dir>/${yamlConfigFile} doesn't exist\n`);
    return;
  }

  if (process.env[VERBOSE_ENV]) {
    process.stdout.write(`  - write <workspace-dir>/${instanceEnvFile}\n`);
  }

  const configObj = simpleReadJson(haComponentConfig);
  const envContent = ['#!/bin/sh', ''];
  const escapeEnvValue = (val) => {
    val = `${val}`;
    if (val.startsWith('"') && val.endsWith('"')) {
      return val;
    } else if (val.indexOf('"') > -1) {
      return `"${val.replaceAll('"', '\\"')}"`;
    } else {
      return `"${val}"`;
    }
  };
  const pushKeyValue = (key, val) => {
    envContent.push([key, escapeEnvValue(val)].join('='));
  };

  for (const key in YAML_TO_ENV_MAPPING) {
    if (YAML_TO_ENV_MAPPING[key] === false) {
      continue;
    } else if (_.isString(YAML_TO_ENV_MAPPING[key])) {
      if (YAML_TO_ENV_MAPPING[key].startsWith('# ')) { // comments
        envContent.push(YAML_TO_ENV_MAPPING[key]);
      } else if (YAML_TO_ENV_MAPPING[key] === '\n') { // separator
        envContent.push('');
      } else {
        const val = _.get(configObj, YAML_TO_ENV_MAPPING[key]);
        if (!_.isUndefined(val)) {
          pushKeyValue(key, val);
        }
      }
    } else if (_.isArray(YAML_TO_ENV_MAPPING[key])) {
      let lastVal = null;
      YAML_TO_ENV_MAPPING[key].forEach(k => {
        const thisVal = _.get(configObj, `${k}`);
        if (lastVal !== null && lastVal !== thisVal) {
          process.stderr.write(`WARNING: <workspace-dir>/${yamlConfigFile} value of ${k} is not same as other sibling configs\n`);
        }
        lastVal = thisVal;
      });
      if (lastVal !== null && !_.isUndefined(lastVal)) {
        pushKeyValue(key, lastVal);
      }
    } else if (_.isFunction(YAML_TO_ENV_MAPPING[key])) {
      const val = YAML_TO_ENV_MAPPING[key](configObj, haInstance, null);
      if (!_.isUndefined(val)) {
        pushKeyValue(key, val);
      }
    }
  }

  envContent.push('');
  envContent.push('# other environments kept as-is');
  if (configObj && configObj.zowe && configObj.zowe.environments) {
    for (const key in configObj.zowe.environments) {
      if (key === 'ZOWE_IP_ADDRESS') {
        // we didn't define a YAML entry for ip address, but spread it to haInstances.<instance-id>.ip
        // this should have been handled by yaml2env mapping
        continue;
      }
      pushKeyValue(key, configObj.zowe.environments[key]);
    }
  }

  fs.writeFileSync(haInstanceEnv, envContent.join('\n') + '\n', {
    mode: DEFAULT_NEW_FILE_MODE,
  });
};

// convert a HA instance YAML config to old instance.env format
const convertHaInstanceYamlToEnv = (workspaceDir, haInstance) => {
  const haConfigFile = `.zowe-${haInstance}.json`;
  const haInstanceEnvFile = `.instance-${haInstance}.env`;
  convertZoweYamlToEnv(workspaceDir, haInstance, haConfigFile, haInstanceEnvFile);
};

// convert one component YAML config to old instance.env format
const convertComponentYamlToEnv = (workspaceDir, haInstance, componentId) => {
  const componentConfigFile = `${componentId}/.configs-${haInstance}.json`;
  const componentInstanceEnvFile = `${componentId}/.instance-${haInstance}.env`;
  convertZoweYamlToEnv(workspaceDir, haInstance, componentConfigFile, componentInstanceEnvFile);
};

// convert YAML configs of all HA instances to old instance.env format
const convertAllComponentYamlsToEnv = (workspaceDir, haInstance) => {
  workspaceDir = workspaceDir ? workspaceDir : process.env.WORKSPACE_DIR;
  if (!workspaceDir) {
    throw new Error('Environment WORKSPACE_DIR is required');
  }

  // find components
  const components = fs.readdirSync(workspaceDir).filter(file => {
    return fs.statSync(path.resolve(workspaceDir, file)).isDirectory();
  });
  if (process.env[VERBOSE_ENV]) {
    process.stdout.write(`- found ${components.length} components\n`);
  }

  components.forEach(component => {
    convertComponentYamlToEnv(workspaceDir, haInstance, component);
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
      fs.writeFileSync(toFile, content, {
        mode: DEFAULT_NEW_FILE_MODE,
      });
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
      fs.writeFileSync(toFile, content, {
        mode: DEFAULT_NEW_FILE_MODE,
      });
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
  fs.writeFileSync(yamlFile, yawn.yaml, {
    mode: DEFAULT_NEW_FILE_MODE,
  });
};

module.exports = {
  convertToYamlConfig,
  readYaml,
  convertConfigs,
  convertHaInstanceYamlToEnv,
  convertComponentYamlToEnv,
  convertAllComponentYamlsToEnv,
  writeYaml,
  writeJson,
  updateYaml,
};
