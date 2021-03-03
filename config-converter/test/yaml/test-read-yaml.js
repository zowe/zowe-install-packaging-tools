/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const debug = require('debug')('zcc-test:read-yaml');

const { expect } = require('chai');
const _ = require('lodash');

const { readYaml } = require('../../src/libs/yaml');
const { getYamlResource } = require('../utils');

describe('test yaml utility method readYaml', function () {

  it('should return object with simple YAML file (without include)', () => {
    const result = readYaml(getYamlResource('simple'));
    debug(result);

    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.runtimeDirectory')).to.equal('/ZOWE/staging/zowe');
    expect(_.get(result, 'components.discovery.debug')).to.be.true;
  });

  it('should return object with included YAML file', () => {
    const result = readYaml(getYamlResource('with-include'));
    debug(result);

    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.runtimeDirectory')).to.equal('/ZOWE/staging/zowe');
    expect(_.get(result, 'components.api-catalog.enabled')).to.be.false;
    expect(_.get(result, 'components.api-catalog.port')).to.equal('1234');
    expect(_.get(result, 'components.api-catalog.not-override')).to.equal('value');
  });

  it('should return correct array if same YAML file is included multiple times', () => {
    const result = readYaml(getYamlResource('with-include', 'array-of-objects.yaml'));
    debug(result);

    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.runtimeDirectory')).to.equal('/ZOWE/staging/zowe');
    expect(_.get(result, 'components.0.enabled')).to.be.false;
    expect(_.get(result, 'components.1.port')).to.equal('1234');
    expect(_.get(result, 'components.0.not-override')).to.equal('value');
  });

  it('should throw error if include YAML file doesn\'t not exist', () => {
    const testFunction = () => {
      readYaml(getYamlResource('with-include', 'zowe-missing-include.yaml'));
    };

    expect(testFunction).to.throw('no such file or directory');
  });

});
