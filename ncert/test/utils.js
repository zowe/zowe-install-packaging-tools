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
const expect = require('chai').expect;
const _ = require('lodash');
const debug = require('debug')('zcc-test:utils');

const ROOT_DIR = path.resolve(__dirname, '../');
const CERTIFICATE_TOOL_CLI = path.resolve(ROOT_DIR, './src/cli.js');
const RESOURCES_DIR = path.resolve(ROOT_DIR, './test/resources');

const execCertificateTool = (...args) => {
  debug('> arguments: %s', args.join(' '));
  const { status, stdout, stderr } = child_process.spawnSync('node', [CERTIFICATE_TOOL_CLI, ...args]);
  debug('< exit code: %i', status);
  debug('< stdout: %s', stdout);
  debug('< stderr: %s', stderr);

  return {
    rc: status,
    stdout: stdout.toString(),
    stderr: stderr.toString(),
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

const testCertificateTool = (args = [], expected = {}, exactMatch = false) => {
  const result = execCertificateTool(...args);

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
};

module.exports = {
  ROOT_DIR,
  CERTIFICATE_TOOL_CLI,
  RESOURCES_DIR,
  execCertificateTool,
  validateValue,
  testCertificateTool,
};
