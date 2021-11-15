/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const debug = require('debug')('zcc-test:yaml:convert-configs-cli');

const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const tmp = require('tmp');

const { updateYaml } = require('../../src/libs/yaml');
const { simpleReadYaml } = require('../../src/libs/index');
const { RESOURCES_DIR, getYamlResource, testConfigConverter, showFiles, deleteAllFiles } = require('../utils');

describe('test zcc yaml convert', function () {
  const cliParams = ['yaml', 'convert'];
  const resourceCategory = 'ha-instances';
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

    fs.mkdirSync(path.resolve(runtimeDir, 'components', 'gateway'));
    fs.mkdirSync(path.resolve(extensionDir, 'discovery'));
    fs.mkdirSync(path.resolve(extensionDir, 'dummy'));
    fs.copyFileSync(path.resolve(RESOURCES_DIR, 'yaml', resourceCategory, 'gateway', 'manifest.json'), path.resolve(runtimeDir, 'components', 'gateway', 'manifest.json'));
    fs.copyFileSync(path.resolve(RESOURCES_DIR, 'yaml', resourceCategory, 'discovery', 'manifest.yaml'), path.resolve(extensionDir, 'discovery', 'manifest.yaml'));
    fs.copyFileSync(path.resolve(RESOURCES_DIR, 'yaml', resourceCategory, 'dummy', '.keep'), path.resolve(extensionDir, 'dummy', '.keep'));
    debug('temporary directory prepared');
    showFiles(tmpDir);
  });

  afterEach(() => {
    if (tmpDirObj) {
      deleteAllFiles(tmpDirObj.name);
      tmpDirObj.removeCallback();
    }
  });

  it('should throw error if workspace directory doesn\'t have a value', () => {
    testConfigConverter([...cliParams, targetYaml], {
      rc: 1,
      stdout: '',
      stderr: ['Environment WORKSPACE_DIR is required'],
    });
  });

  it('should generate .zowe.json and components default configs should be applied', () => {
    testConfigConverter([...cliParams, '--workspace-dir', workspaceDir, '--ha-instance-id', 'default', targetYaml], {
      rc: 0,
      stdout: '',
      stderr: '',
    });

    const fileToCheck = path.resolve(workspaceDir, 'gateway', '.configs-default.json');
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
    testConfigConverter([...cliParams, '--workspace-dir', workspaceDir, '--ha-instance-id', 'first', '-v', targetYaml], {
      rc: 0,
      stdout: [
        'CLI arguments',
        'Reading',
        'Converting',
        /found \d+ components/,
        /process HA instance "first"/,
        'write <workspace-dir>/discovery/.configs-first.json',
      ],
      stderr: '',
    });

    const fileToCheck = path.resolve(workspaceDir, 'gateway', '.configs-first.json');
    debug(`checking ${fileToCheck}`);

    const existence = fs.existsSync(fileToCheck);
    expect(existence).to.be.true;
  });

});
