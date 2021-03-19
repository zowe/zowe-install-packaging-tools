/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const debug = require('debug')('zcc-test:yaml:to-env-customized-cert-cli');

const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp');

const { convertConfigs } = require('../../src/libs/yaml');
const { simpleReadYaml } = require('../../src/libs/index');
const { RESOURCES_DIR, getYamlResource, testConfigConverter, showFiles, deleteAllFiles } = require('../utils');

describe('test zcc yaml to-env <yaml-with-full>', function () {
  const cliParams = ['yaml', 'to-env'];
  const resourceCategory = 'customized-cert';
  const componentId = 'zss';
  let obj = null;
  let workspaceDirObj = null;
  let workspaceDir = null;

  beforeEach(() => {
    obj = simpleReadYaml(getYamlResource(resourceCategory));

    // prepare workspace directory
    workspaceDirObj = tmp.dirSync();
    workspaceDir = workspaceDirObj.name;
    debug(`workspace directory: ${workspaceDir}`);

    fs.mkdirSync(path.resolve(workspaceDir, componentId));
    fs.copyFileSync(path.resolve(RESOURCES_DIR, 'yaml', resourceCategory, componentId, '.manifest.json'), path.resolve(workspaceDir, componentId, '.manifest.json'));
    debug('workspace directory prepared');
    showFiles(workspaceDir);

    convertConfigs(obj, 'default', workspaceDir);
    debug('workspace directory after converted');
    showFiles(workspaceDir);
  });

  afterEach(() => {
    if (workspaceDirObj) {
      deleteAllFiles(workspaceDirObj.name);
      workspaceDirObj.removeCallback();
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
    expect(content).to.include('KEY_ALIAS=zss');
    expect(content).to.include('KEYSTORE=/var/zowe/keystore/zos/zss.keystore.p12');
    expect(content).to.include('TRUSTSTORE=/var/zowe/keystore/localhost/localhost.truststore.p12');
    expect(content).to.include('ZWE_LAUNCH_COMPONENTS=zss');
  });

});
