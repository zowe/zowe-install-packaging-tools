/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const debug = require('debug')('zcc-test:yaml:delete-yaml');

const fs = require('fs');
const { expect } = require('chai');
const _ = require('lodash');
const tmp = require('tmp');

const { readZoweYaml, deleteYamlProperty } = require('../../src/libs/yaml');
const { getYamlResource } = require('../utils');

describe('test yaml utility method deleteYamlProperty', function () {
  let tmpfile;

  beforeEach(() => {
    tmpfile = null;
  });

  afterEach(() => {
    if (tmpfile) {
      tmpfile.removeCallback();
    }
  });

  it('should return object without deleted properties', () => {
    tmpfile = tmp.fileSync();
    debug('temporary file created: %s', tmpfile.name);
    fs.copyFileSync(getYamlResource('simple'), tmpfile.name);

    deleteYamlProperty(tmpfile.name, 'zowe.runtimeDirectory');

    const text = fs.readFileSync(tmpfile.name).toString();
    debug(text);

    expect(text, 'should keep comments').to.include('SPDX-License-Identifier');

    const result = readZoweYaml(tmpfile.name);
    debug(result);

    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.runtimeDirectory')).to.be.undefined;
    expect(_.get(result, 'components.discovery.debug')).to.true;
  });

});
