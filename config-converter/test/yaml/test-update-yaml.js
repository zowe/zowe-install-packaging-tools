/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const debug = require('debug')('zcc-test:update-yaml');

const fs = require('fs');
const { expect } = require('chai');
const _ = require('lodash');
const tmp = require('tmp');

const { readYaml, updateYaml } = require('../../src/libs/yaml');
const { getYamlResource } = require('../utils');

describe('test yaml utility method readYaml', function () {
  let tmpfile;

  beforeEach(() => {
    tmpfile = null;
  });

  afterEach(() => {
    if (tmpfile) {
      tmpfile.removeCallback();
    }
  });

  it('should return object with simple YAML file (without include)', () => {
    tmpfile = tmp.fileSync();
    debug('temporary file created: %s', tmpfile.name);
    fs.copyFileSync(getYamlResource('simple'), tmpfile.name);

    updateYaml(tmpfile.name, 'zowe.runtimeDirectory', '/new/value');
    updateYaml(tmpfile.name, 'components.discovery.debug', 'false');

    const text = fs.readFileSync(tmpfile.name).toString();
    debug(text);

    expect(text, 'should keep comments').to.include('SPDX-License-Identifier');

    const result = readYaml(tmpfile.name);
    debug(result);

    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.runtimeDirectory')).to.equal('/new/value');
    expect(_.get(result, 'components.discovery.debug')).to.false;
  });

});
