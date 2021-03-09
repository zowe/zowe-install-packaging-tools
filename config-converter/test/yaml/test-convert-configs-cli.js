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
const _ = require('lodash');
const tmp = require('tmp');

const { simpleReadYaml } = require('../../src/libs/index');
const { RESOURCES_DIR, getYamlResource, testConfigConverter, showFiles, deleteAllFiles } = require('../utils');

describe('test zcc yaml convert', function () {
  const cliParams = ['yaml', 'convert'];
  const resourceCategory = 'ha-instances';
  let workspaceDirObj = null;
  let workspaceDir = null;

  beforeEach(() => {
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

  afterEach(() => {
    if (workspaceDirObj) {
      deleteAllFiles(workspaceDirObj.name);
      workspaceDirObj.removeCallback();
    }
  });

  it('should throw error if workspace directory doesn\'t have a value', () => {
    testConfigConverter([...cliParams, getYamlResource(resourceCategory)], {
      rc: 1,
      stdout: '',
      stderr: ['Environment WORKSPACE_DIR is required'],
    });
  });

  it('should generate .zowe.yaml and components default configs should be applied', () => {
    testConfigConverter([...cliParams, '--workspace-dir', workspaceDir, getYamlResource(resourceCategory)], {
      rc: 0,
      stdout: '',
      stderr: '',
    });

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

  it('should show verbose information if -v is specified', () => {
    testConfigConverter([...cliParams, '--workspace-dir', workspaceDir, '--ha-instance-id', 'first', '-v', getYamlResource(resourceCategory)], {
      rc: 0,
      stdout: [
        'CLI arguments',
        'Reading',
        'Converting',
        /found \d+ components/,
        /process HA instance "first"/,
        'write <workspace-dir>/.zowe.yaml',
        'write <workspace-dir>/discovery/.configs-first.json',
      ],
      stderr: '',
    });

    const fileToCheck = path.resolve(workspaceDir, '.zowe.yaml');
    debug(`checking ${fileToCheck}`);

    const existence = fs.existsSync(fileToCheck);
    expect(existence).to.be.true;
  });

});
