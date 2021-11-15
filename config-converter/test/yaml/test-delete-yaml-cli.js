/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

// const debug = require('debug')('zcc-test:yaml:delete-yaml-cli');

const fs = require('fs');
const { expect } = require('chai');
const _ = require('lodash');
const tmp = require('tmp');
const { getYamlResource, testConfigConverter } = require('../utils');
const { simpleReadYaml } = require('../../src/libs');

describe('test zcc yaml delete', function () {
  const cliParams = ['yaml', 'delete'];
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

  it('should delete the YAML path to new value', () => {
    testConfigConverter([...cliParams, tmpfile.name, 'zowe.jobPrefix'], {
      rc: 0,
      stdout: '',
      stderr: '',
    });

    const result = simpleReadYaml(tmpfile.name);
    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.jobPrefix')).to.be.undefined;
    expect(_.get(result, 'components.discovery.debug')).to.true;
  });

  it('should show verbose information if -v is specified', () => {
    testConfigConverter([...cliParams, '-v', tmpfile.name, 'zowe.jobPrefix'], {
      rc: 0,
      stdout: [
        'CLI arguments',
        'Deleting',
      ],
      stderr: '',
    });

    const result = simpleReadYaml(tmpfile.name);
    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.jobPrefix')).to.be.undefined;
    expect(_.get(result, 'components.discovery.debug')).to.true;
  });

});
