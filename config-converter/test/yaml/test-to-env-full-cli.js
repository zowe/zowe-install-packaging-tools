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
const { getYamlResource, testConfigConverter, showFiles, deleteAllFiles } = require('../utils');

describe('test zcc yaml to-env <yaml-with-full>', function () {
  const cliParams = ['yaml', 'to-env'];
  const resourceCategory = 'full';
  let obj = null;
  let workspaceDirObj = null;
  let workspaceDir = null;

  beforeEach(() => {
    obj = simpleReadYaml(getYamlResource(resourceCategory));

    // prepare workspace directory
    workspaceDirObj = tmp.dirSync();
    workspaceDir = workspaceDirObj.name;
    debug(`workspace directory: ${workspaceDir}`);

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

    const fileToCheck = path.resolve(workspaceDir, '.instance-default.env');
    debug(`checking ${fileToCheck}`);

    const existence = fs.existsSync(fileToCheck);
    expect(existence).to.be.true;

    let content = fs.readFileSync(path.resolve(workspaceDir, '.instance-default.env')).toString();
    expect(content).to.include('GATEWAY_PORT=7554');
    expect(content).to.include('LAUNCH_COMPONENT_GROUPS=dummy');
    expect(content).to.include('ZWE_LAUNCH_COMPONENTS=zss');
    expect(content).to.include('ZOWE_EXPLORER_HOST=zos.test-domain.com');
    expect(content).to.include('APIML_SECURITY_X509_ENABLED=true');
  });

});
