/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const debug = require('debug')('zcc-test:yaml:convert-configs');

const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const tmp = require('tmp');

const { convertConfigs } = require('../../src/libs/yaml');
const { simpleReadJson, simpleReadYaml } = require('../../src/libs/index');
const { RESOURCES_DIR, getYamlResource, showFiles, deleteAllFiles } = require('../utils');

describe('test yaml utility method convertConfigs', function () {
  const resourceCategory = 'ha-instances';
  let obj = null;
  let workspaceDirObj = null;
  let workspaceDir = null;

  before(() => {
    obj = simpleReadYaml(getYamlResource(resourceCategory));

    // prepare workspace directory
    workspaceDirObj = tmp.dirSync();
    workspaceDir = workspaceDirObj.name;
    debug(`workspace directory: ${workspaceDir}`);

    fs.mkdirSync(path.resolve(workspaceDir, 'gateway'));
    fs.mkdirSync(path.resolve(workspaceDir, 'discovery'));
    fs.mkdirSync(path.resolve(workspaceDir, 'dummy'));
    fs.copyFileSync(path.resolve(RESOURCES_DIR, 'yaml', resourceCategory, 'gateway', '.manifest.json'), path.resolve(workspaceDir, 'gateway', '.manifest.json'));
    fs.copyFileSync(path.resolve(RESOURCES_DIR, 'yaml', resourceCategory, 'discovery', '.manifest.json'), path.resolve(workspaceDir, 'discovery', '.manifest.json'));
    fs.copyFileSync(path.resolve(RESOURCES_DIR, 'yaml', resourceCategory, 'dummy', '.keep'), path.resolve(workspaceDir, 'dummy', '.keep'));
    debug('workspace directory prepared');
    showFiles(workspaceDir);
  });

  after(() => {
    if (workspaceDirObj) {
      deleteAllFiles(workspaceDirObj.name);
      workspaceDirObj.removeCallback();
    }
  });

  it('should throw error if workspace directory doesn\'t have a value', () => {
    const testFunction = () => {
      convertConfigs(obj, '');
    };

    expect(testFunction).to.throw('Environment WORKSPACE_DIR is required');
  });

  it('should generate .zowe.yaml and components default configs should be applied', () => {
    convertConfigs(obj, '', workspaceDir);
    debug('workspace directory after converted');
    showFiles(workspaceDir);

    const fileToCheck = path.resolve(workspaceDir, '.zowe.yaml');
    debug(`checking ${fileToCheck}`);

    const existence = fs.existsSync(fileToCheck);
    expect(existence).to.be.true;

    const result = simpleReadYaml(fileToCheck);
    debug(JSON.stringify(result, null, 2));
    expect(result).to.be.an('object');

    expect(_.get(result, 'components.gateway.enabled')).to.be.true;
    expect(_.get(result, 'components.gateway.port')).to.equal(8888);
    expect(_.get(result, 'components.gateway.anotherConfig')).to.equal('default-value');
    expect(_.get(result, 'components.discovery.port')).to.equal(12346);
    expect(_.get(result, 'components.discovery.discoverySpecialConfig')).to.equal('default-value');
  });

  it('should generate discovery/.configs-default.json', () => {
    convertConfigs(obj, 'default', workspaceDir);
    debug('workspace directory after converted');
    showFiles(workspaceDir);

    const fileToCheck = path.resolve(workspaceDir, 'discovery', '.configs-default.json');
    debug(`checking ${fileToCheck}`);

    const existence = fs.existsSync(fileToCheck);
    expect(existence).to.be.true;

    const result = simpleReadJson(fileToCheck);
    debug(JSON.stringify(result, null, 2));
    expect(result).to.be.an('object');

    expect(_.get(result, 'haInstance.id')).to.equal('default');
    expect(_.get(result, 'haInstance.hostname')).to.equal('my-default-zos.com');
    expect(_.get(result, 'components.gateway.enabled')).to.be.true;
    expect(_.get(result, 'components.gateway.port')).to.equal(8888);
    expect(_.get(result, 'components.gateway.anotherConfig')).to.equal('default-value');
    expect(_.get(result, 'components.discovery.port')).to.equal(12346);
    expect(_.get(result, 'components.discovery.discoverySpecialConfig')).to.equal('default-value');

    expect(_.get(result, 'configs.port')).to.equal(12346);
    expect(_.get(result, 'configs.discoverySpecialConfig')).to.equal('default-value');
  });

  it('should generate discovery/.configs-first.json', () => {
    convertConfigs(obj, 'first', workspaceDir);
    debug('workspace directory after converted');
    showFiles(workspaceDir);

    const fileToCheck = path.resolve(workspaceDir, 'discovery', '.configs-first.json');
    debug(`checking ${fileToCheck}`);

    const existence = fs.existsSync(fileToCheck);
    expect(existence).to.be.true;

    const result = simpleReadJson(fileToCheck);
    debug(JSON.stringify(result, null, 2));
    expect(result).to.be.an('object');

    expect(_.get(result, 'haInstance.id')).to.equal('first');
    expect(_.get(result, 'haInstance.hostname')).to.equal('my-first-zos.com');
    expect(_.get(result, 'components.gateway.enabled')).to.be.true;
    expect(_.get(result, 'components.gateway.port')).to.equal(8888);
    expect(_.get(result, 'components.gateway.anotherConfig')).to.equal('default-value');
    expect(_.get(result, 'components.discovery.port')).to.equal(12346);
    expect(_.get(result, 'components.discovery.discoverySpecialConfig')).to.equal('default-value');

    expect(_.get(result, 'configs.port')).to.equal(12346);
    expect(_.get(result, 'configs.discoverySpecialConfig')).to.equal('default-value');
  });

  it('should generate discovery/.configs-second.json', () => {
    convertConfigs(obj, 'second', workspaceDir);
    debug('workspace directory after converted');
    showFiles(workspaceDir);

    const fileToCheck = path.resolve(workspaceDir, 'discovery', '.configs-second.json');
    debug(`checking ${fileToCheck}`);

    const existence = fs.existsSync(fileToCheck);
    expect(existence).to.be.true;

    const result = simpleReadJson(fileToCheck);
    debug(JSON.stringify(result, null, 2));
    expect(result).to.be.an('object');

    expect(_.get(result, 'haInstance.id')).to.equal('second');
    expect(_.get(result, 'haInstance.hostname')).to.equal('my-second-zos.com');
    expect(_.get(result, 'components.gateway.enabled')).to.be.false;
    expect(_.get(result, 'components.gateway.port')).to.equal(7554);
    expect(_.get(result, 'components.gateway.anotherConfig')).to.equal('default-value');
    expect(_.get(result, 'components.discovery.port')).to.equal(7553);
    expect(_.get(result, 'components.discovery.discoverySpecialConfig')).to.equal('default-value');

    expect(_.get(result, 'configs.port')).to.equal(7553);
    expect(_.get(result, 'configs.discoverySpecialConfig')).to.equal('default-value');
  });

  it('should generate discovery/.configs-second-alt.json', () => {
    convertConfigs(obj, 'second-alt', workspaceDir);
    debug('workspace directory after converted');
    showFiles(workspaceDir);

    const fileToCheck = path.resolve(workspaceDir, 'discovery', '.configs-second-alt.json');
    debug(`checking ${fileToCheck}`);

    const existence = fs.existsSync(fileToCheck);
    expect(existence).to.be.true;

    const result = simpleReadJson(fileToCheck);
    debug(JSON.stringify(result, null, 2));
    expect(result).to.be.an('object');

    expect(_.get(result, 'haInstance.id')).to.equal('second-alt');
    expect(_.get(result, 'haInstance.hostname')).to.equal('my-second-zos.com');
    expect(_.get(result, 'components.gateway.enabled')).to.be.true;
    expect(_.get(result, 'components.gateway.port')).to.equal(17554);
    expect(_.get(result, 'components.gateway.anotherConfig')).to.equal('customized-value');
    expect(_.get(result, 'components.discovery.enabled')).to.be.false;
    expect(_.get(result, 'components.discovery.port')).to.equal(17553);
    expect(_.get(result, 'components.discovery.discoverySpecialConfig')).to.equal('default-value');

    expect(_.get(result, 'configs.enabled')).to.be.false;
    expect(_.get(result, 'configs.port')).to.equal(17553);
    expect(_.get(result, 'configs.discoverySpecialConfig')).to.equal('default-value');
  });

});
