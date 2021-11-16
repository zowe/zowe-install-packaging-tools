/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const debug = require('debug')('zcc-test:yaml:to-env-hainstances-cli');

const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp');

const { convertConfigs, updateYaml } = require('../../src/libs/yaml');
const { simpleReadYaml } = require('../../src/libs/index');
const { RESOURCES_DIR, getYamlResource, testConfigConverter, showFiles, deleteAllFiles } = require('../utils');

describe('test zcc yaml to-env <yaml-with-ha-instances>', function () {
  const cliParams = ['yaml', 'to-env'];
  const resourceCategory = 'ha-instances';
  const componentId = 'discovery';
  let obj = null;
  let tmpDirObj = null;
  let runtimeDir = null;
  let extensionDir = null;
  let instanceDir = null;
  let workspaceDir = null;
  let targetYaml = null;

  beforeEach(() => {
    // prepare temporary directory
    tmpDirObj = tmp.dirSync();
    const tmpDir = tmpDirObj.name;
    runtimeDir = path.resolve(tmpDir, 'runtime');
    fs.mkdirSync(runtimeDir);
    fs.mkdirSync(path.resolve(runtimeDir, 'components'));
    extensionDir = path.resolve(tmpDir, 'extensions');
    fs.mkdirSync(extensionDir);
    instanceDir = path.resolve(tmpDir, 'instance');
    fs.mkdirSync(instanceDir);
    workspaceDir = path.resolve(instanceDir, '.env');
    fs.mkdirSync(workspaceDir);
    debug(`temporary directory: ${tmpDir}`);

    // copy and update zowe.yaml with new runtime/extension dir
    const yaml = getYamlResource(resourceCategory);
    targetYaml = path.resolve(instanceDir, 'zowe.yaml');
    fs.copyFileSync(yaml, targetYaml);
    updateYaml(targetYaml, 'zowe.runtimeDirectory', runtimeDir);
    updateYaml(targetYaml, 'zowe.extensionDirectory', extensionDir);
    obj = simpleReadYaml(targetYaml);

    fs.mkdirSync(path.resolve(runtimeDir, 'components', 'gateway'));
    fs.mkdirSync(path.resolve(extensionDir, 'discovery'));
    fs.mkdirSync(path.resolve(extensionDir, 'dummy'));
    fs.copyFileSync(path.resolve(RESOURCES_DIR, 'yaml', resourceCategory, 'gateway', 'manifest.json'), path.resolve(runtimeDir, 'components', 'gateway', 'manifest.json'));
    fs.copyFileSync(path.resolve(RESOURCES_DIR, 'yaml', resourceCategory, 'discovery', 'manifest.yaml'), path.resolve(extensionDir, 'discovery', 'manifest.yaml'));
    fs.copyFileSync(path.resolve(RESOURCES_DIR, 'yaml', resourceCategory, 'dummy', '.keep'), path.resolve(extensionDir, 'dummy', '.keep'));
    debug('temporary directory prepared');
    showFiles(tmpDir);

    convertConfigs(obj, 'default', workspaceDir);
    convertConfigs(obj, 'first', workspaceDir);
    convertConfigs(obj, 'second', workspaceDir);
    convertConfigs(obj, 'second-alt', workspaceDir);
    debug('workspace directory after converted');
    showFiles(workspaceDir);
  });

  afterEach(() => {
    if (tmpDirObj) {
      deleteAllFiles(tmpDirObj.name);
      tmpDirObj.removeCallback();
    }
  });

  it('should convert YAML config to instance env files', () => {
    ['default', 'first', 'second', 'second-alt'].forEach(haInstanceId => {
      testConfigConverter([...cliParams, '-v', '--workspace-dir', workspaceDir, '--ha-instance-id', haInstanceId], {
        rc: 0,
        stdout: '',
        stderr: '',
      });

      const fileToCheck = path.resolve(workspaceDir, componentId, `.instance-${haInstanceId}.env`);
      debug(`checking ${fileToCheck}`);
  
      const existence = fs.existsSync(fileToCheck);
      expect(existence).to.be.true;
    });

    debug(`validating workspace/${componentId}/.instance-default.env`);
    let content = fs.readFileSync(path.resolve(workspaceDir, componentId, '.instance-default.env')).toString();
    expect(content).to.include('CONFIGS_PORT="12346"');
    expect(content).to.include('COMPONENTS_GATEWAY_PORT="8888"');
    expect(content).to.include('HA_INSTANCE_HOSTNAME="my-default-zos.com"');
    expect(content).to.include('UNKNOWN_KEY="value"');

    debug(`validating workspace/${componentId}/.instance-first.env`);
    content = fs.readFileSync(path.resolve(workspaceDir, componentId, '.instance-first.env')).toString();
    expect(content).to.include('CONFIGS_PORT="12346"');
    expect(content).to.include('COMPONENTS_GATEWAY_PORT="8888"');
    expect(content).to.include('HA_INSTANCE_HOSTNAME="my-first-zos.com"');
    expect(content).to.include('UNKNOWN_KEY="value"');

    debug(`validating workspace/${componentId}/.instance-second.env`);
    content = fs.readFileSync(path.resolve(workspaceDir, componentId, '.instance-second.env')).toString();
    expect(content).to.include('CONFIGS_PORT="7553"');
    expect(content).to.include('COMPONENTS_GATEWAY_PORT="7554"');
    expect(content).to.include('HA_INSTANCE_HOSTNAME="my-second-zos.com"');
    expect(content).to.include('UNKNOWN_KEY="value"');

    debug(`validating workspace/${componentId}/.instance-second-alt.env`);
    content = fs.readFileSync(path.resolve(workspaceDir, componentId, '.instance-second-alt.env')).toString();
    expect(content).to.include('CONFIGS_PORT="17553"');
    expect(content).to.include('COMPONENTS_GATEWAY_PORT="17554"');
    expect(content).to.include('HA_INSTANCE_HOSTNAME="my-second-zos.com"');
    expect(content).to.include('UNKNOWN_KEY="value"');
  });

});
