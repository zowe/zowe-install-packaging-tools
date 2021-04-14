/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

// const debug = require('debug')('zcc-test:yaml:update-yaml-cli');

const fs = require('fs');
const { expect } = require('chai');
const _ = require('lodash');
const tmp = require('tmp');
const { getYamlResource, testConfigConverter } = require('../utils');
const { simpleReadYaml } = require('../../src/libs');

describe('test zcc yaml update', function () {
  const cliParams = ['yaml', 'update'];
  const resourceCategory = 'simple';
  let tmpfile;

  beforeEach(() => {
    tmpfile = tmp.fileSync();
    fs.copyFileSync(getYamlResource(resourceCategory), tmpfile.name);
  });

  afterEach(() => {
    if (tmpfile) {
      tmpfile.removeCallback();
    }
  });

  it('should throw error if missing parameters', () => {
    testConfigConverter([...cliParams, tmpfile.name], {
      rc: 1,
      stdout: '',
      stderr: ['Not enough non-option arguments'],
    });
  });

  it('should update the YAML path to new value', () => {
    testConfigConverter([...cliParams, tmpfile.name, 'zowe.jobPrefix', 'NEW'], {
      rc: 0,
      stdout: '',
      stderr: '',
    });

    const result = simpleReadYaml(tmpfile.name);
    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.jobPrefix')).to.equal('NEW');
  });

  it('should show verbose information if -v is specified', () => {
    testConfigConverter([...cliParams, '-v', tmpfile.name, 'zowe.jobPrefix', 'NEW'], {
      rc: 0,
      stdout: [
        'CLI arguments',
        'Updating',
      ],
      stderr: '',
    });

    const result = simpleReadYaml(tmpfile.name);
    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.jobPrefix')).to.equal('NEW');
  });

});
