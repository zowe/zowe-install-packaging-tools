/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const expect = require('chai').expect;
const _ = require('lodash');
const YAML = require('yaml');
const debug = require('debug')('zcc-test:utils');

const { STDOUT_YAML_SEPARATOR, DEFAULT_YAML_INDENT } = require('../src/constants');

const ROOT_DIR = path.resolve(__dirname, '../');
const CONFIG_CONVERTER_CLI = path.resolve(ROOT_DIR, './src/cli.js');
const RESOURCES_DIR = path.resolve(ROOT_DIR, './test/resources');

const extractYamlFromOutput = (stdout) => {
  const idx = stdout.indexOf(STDOUT_YAML_SEPARATOR);
  try {
    if (idx === -1) {
      return YAML.parse(stdout);
    } else {
      return YAML.parse(stdout.substr(idx + STDOUT_YAML_SEPARATOR.length));
    }
  } catch (e) {
    debug('Output is not in YAML format');
    return null;
  }
};

const execConfigConverter = (...args) => {
  debug('> arguments: %s', args.join(' '));
  const { status, stdout, stderr } = child_process.spawnSync('node', [CONFIG_CONVERTER_CLI, ...args]);
  debug('< exit code: %i', status);
  debug('< stdout: %s', stdout);
  debug('< stderr: %s', stderr);

  return {
    rc: status,
    stdout: stdout.toString(),
    stderr: stderr.toString(),
    yaml: extractYamlFromOutput(stdout.toString()),
  };
};

const validateValue = (message, expected, actual, exactMatch = false) => {
  if (exactMatch) {
    expect(actual, message).to.equal(expected);
  } else {
    if (!Array.isArray(expected)) {
      expected = [expected];
    }
    for (const one of expected) {
      if (one instanceof RegExp) {
        expect(actual, message).to.match(one);
      } else if (_.isUndefined(one)) {
        expect(actual, message).to.be.undefined;
      } else if (_.isBoolean(one)) {
        expect(actual, message).to.equal(one);
      } else {
        expect(actual, message).to.have.string(one);
      }
    }
  }
};

const testConfigConverter = (args = [], expected = {}, exactMatch = false) => {
  const result = execConfigConverter(...args);

  // apply default value
  expected = Object.assign({rc: 0}, expected);

  // check result
  expect(result.rc).to.equal(expected.rc);
  if (_.has(expected, 'stdout')) {
    validateValue('stdout', expected['stdout'], result['stdout'], exactMatch);
  }
  if (_.has(expected, 'stderr')) {
    validateValue('stderr', expected['stderr'], result['stderr'], exactMatch);
  }
  if (_.has(expected, 'yaml')) {
    for (const k in expected['yaml']) {
      const v = _.get(result.yaml, k);
      validateValue(`yaml path "${k}"`, expected['yaml'][k], v, exactMatch);
    }
  }
};

const getInstanceEnvResource = (category, file = 'instance.env') => {
  return path.resolve(RESOURCES_DIR, 'instance-env', category, file);
};

const getYamlResource = (category, file = 'zowe.yaml') => {
  return path.resolve(RESOURCES_DIR, 'yaml', category, file);
};

const reformatYaml = (file) => {
  return YAML.stringify(YAML.parse(fs.readFileSync(file).toString()), {
    indent: DEFAULT_YAML_INDENT,
  });
};

const showFiles = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    debug(`- ${file}`);
    const absPath = path.resolve(dir, file);
    if (fs.statSync(absPath).isDirectory()) {
      fs.readdirSync(absPath).forEach(subfile => {
        debug(`  - ${subfile}`);
      });
    }
  });
};

const deleteAllFiles = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    const absPath = path.resolve(dir, file);
    if (fs.statSync(absPath).isDirectory()) {
      deleteAllFiles(absPath);
      fs.rmdirSync(absPath);
    } else {
      fs.unlinkSync(absPath);
    }
  });
};

module.exports = {
  ROOT_DIR,
  CONFIG_CONVERTER_CLI,
  RESOURCES_DIR,
  extractYamlFromOutput,
  execConfigConverter,
  validateValue,
  testConfigConverter,
  getInstanceEnvResource,
  getYamlResource,
  reformatYaml,
  showFiles,
  deleteAllFiles,
};
