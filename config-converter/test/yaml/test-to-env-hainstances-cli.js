/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const debug = require('debug')('zcc-test:convert-configs');

const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp');

const { convertConfigs } = require('../../src/libs/yaml');
const { simpleReadYaml } = require('../../src/libs/index');
const { RESOURCES_DIR, getYamlResource, testConfigConverter, showFiles, deleteAllFiles } = require('../utils');

describe('test zcc yaml to-env <yaml-with-ha-instances>', function () {
  const cliParams = ['yaml', 'to-env'];
  const resourceCategory = 'ha-instances';
  let obj = null;
  let workspaceDirObj = null;
  let workspaceDir = null;

  beforeEach(() => {
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

    convertConfigs(obj, workspaceDir);
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
    testConfigConverter([...cliParams, path.resolve(workspaceDir, '.zowe.yaml')], {
      rc: 0,
      stdout: '',
      stderr: '',
    });

    ['.instance-default.env', '.instance-first.env', '.instance-second.env', '.instance-second-alt.env'].forEach(env => {
      const fileToCheck = path.resolve(workspaceDir, env);
      debug(`checking ${fileToCheck}`);
  
      const existence = fs.existsSync(fileToCheck);
      expect(existence).to.be.true;
    });

    let content = fs.readFileSync(path.resolve(workspaceDir, '.instance-default.env')).toString();
    expect(content).to.include('DISCOVERY_PORT=12346');
    expect(content).to.include('GATEWAY_PORT=8888');
    // expect(content).to.include('ZOWE_EXPLORER_HOST=my-default-zos.com');
    expect(content).to.include('UNKNOWN_KEY=value');

    content = fs.readFileSync(path.resolve(workspaceDir, '.instance-first.env')).toString();
    expect(content).to.include('DISCOVERY_PORT=12346');
    expect(content).to.include('GATEWAY_PORT=8888');
    // expect(content).to.include('ZOWE_EXPLORER_HOST=my-first-zos.com');
    expect(content).to.include('UNKNOWN_KEY=value');

    content = fs.readFileSync(path.resolve(workspaceDir, '.instance-second.env')).toString();
    expect(content).to.include('DISCOVERY_PORT=7553');
    expect(content).to.include('GATEWAY_PORT=7554');
    // expect(content).to.include('ZOWE_EXPLORER_HOST=my-second-zos.com');
    expect(content).to.include('UNKNOWN_KEY=value');

    content = fs.readFileSync(path.resolve(workspaceDir, '.instance-second-alt.env')).toString();
    expect(content).to.include('DISCOVERY_PORT=17553');
    expect(content).to.include('GATEWAY_PORT=17554');
    // expect(content).to.include('ZOWE_EXPLORER_HOST=my-second-zos.com');
    expect(content).to.include('UNKNOWN_KEY=value');
  });

});
