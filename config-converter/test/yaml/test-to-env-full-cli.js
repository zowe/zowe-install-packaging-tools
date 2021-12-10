/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const debug = require('debug')('zcc-test:yaml:to-env-full-cli');

const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp');

const { convertConfigs, updateYaml } = require('../../src/libs/yaml');
const { simpleReadYaml } = require('../../src/libs/index');
const { RESOURCES_DIR, getYamlResource, testConfigConverter, showFiles, deleteAllFiles } = require('../utils');

describe('test zcc yaml to-env <yaml-with-full>', function () {
  const cliParams = ['yaml', 'to-env'];
  const resourceCategory = 'full';
  const componentId = 'discovery';
  let obj = null;
  let tmpDirObj = null;
  let runtimeDir = null;
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
    obj = simpleReadYaml(targetYaml);

    fs.mkdirSync(path.resolve(runtimeDir, 'components', componentId));
    fs.copyFileSync(path.resolve(RESOURCES_DIR, 'yaml', resourceCategory, componentId, 'manifest.yaml'), path.resolve(runtimeDir, 'components', componentId, 'manifest.yaml'));
    debug('temporary directory prepared');
    showFiles(tmpDir);

    convertConfigs(obj, 'default', workspaceDir);
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
    testConfigConverter([...cliParams, '--workspace-dir', workspaceDir, '--ha-instance-id', 'default'], {
      rc: 0,
      stdout: '',
      stderr: '',
    });

    const fileToCheck = path.resolve(workspaceDir, componentId, '.instance-default.env');
    debug(`checking ${fileToCheck}`);

    const existence = fs.existsSync(fileToCheck);
    expect(existence).to.be.true;

    let content = fs.readFileSync(path.resolve(workspaceDir, componentId, '.instance-default.env')).toString();
    debug(`converted result: ${content}`);
    expect(content).to.include('ZWE_components_gateway_port="7554"');
    expect(content).to.include('ZWE_configs_port="7553"');
    expect(content).to.include('ZWE_haInstance_id="default"');
    expect(content).to.include('ZWE_configs_debug="false"');
    expect(content).to.include('ZWE_configs_discoverySpecialConfig="default-value"');
    expect(content).to.include('JAVA_HOME="/usr/lpp/java/J8.0_64"');
    expect(content).to.include('ZOSMF_PORT="10443"');
    expect(content).to.include('ZWE_DISCOVERY_SERVICES_LIST="https://zos.test-domain.com:7553/eureka/"');
  });

});
