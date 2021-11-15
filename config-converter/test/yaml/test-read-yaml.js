/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const debug = require('debug')('zcc-test:yaml:read-yaml');

const { expect } = require('chai');
const _ = require('lodash');

const { readZoweYaml } = require('../../src/libs/yaml');
const { getYamlResource } = require('../utils');

describe('test yaml utility method readZoweYaml', function () {

  it('should return object with simple YAML file (without include)', () => {
    const result = readZoweYaml(getYamlResource('simple'));
    debug(JSON.stringify(result, null, 2));

    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.runtimeDirectory')).to.equal('/ZOWE/staging/zowe');
    expect(_.get(result, 'components.discovery.debug')).to.be.true;
  });

  it('should return object with included YAML file', () => {
    const result = readZoweYaml(getYamlResource('with-include'));
    debug(JSON.stringify(result, null, 2));

    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.runtimeDirectory')).to.equal('/ZOWE/staging/zowe');
    expect(_.get(result, 'components.api-catalog.enabled')).to.be.false;
    expect(_.get(result, 'components.api-catalog.port')).to.equal('1234');
    // verify object merge
    expect(_.get(result, 'components.api-catalog.keyObj.subkey1')).to.equal('val1');
    expect(_.get(result, 'components.api-catalog.keyObj.subkey2')).to.equal('val2-updated');
    expect(_.get(result, 'components.api-catalog.keyObj.subkey3')).to.equal('val3');
    expect(_.get(result, 'components.api-catalog.keyObj.subkeyObj1.subkey1')).to.equal('val1');
    expect(_.get(result, 'components.api-catalog.keyObj.subkeyObj1.subkey2')).to.equal('val2-updated');
    expect(_.get(result, 'components.api-catalog.keyObj.subkeyObj1.subkey3')).to.equal('val3');
    // verify array merge
    expect(_.get(result, 'components.api-catalog.keyArray.0.subkey01')).to.equal('val01');
    expect(_.get(result, 'components.api-catalog.keyArray.2.subkey21')).to.equal('val21');
  });

  it('should return correct array if same YAML file is included multiple times', () => {
    const result = readZoweYaml(getYamlResource('with-include', 'array-of-objects.yaml'));
    debug(JSON.stringify(result, null, 2));

    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.runtimeDirectory')).to.equal('/ZOWE/staging/zowe');
    expect(_.get(result, 'components.0.enabled')).to.be.false;
    expect(_.get(result, 'components.1.port')).to.equal('1234');
    expect(_.get(result, 'components.0.not-override')).to.equal('value');
  });

  it('should throw error if include YAML file doesn\'t not exist', () => {
    const testFunction = () => {
      readZoweYaml(getYamlResource('with-include', 'zowe-missing-include.yaml'));
    };

    expect(testFunction).to.throw('no such file or directory');
  });

});
