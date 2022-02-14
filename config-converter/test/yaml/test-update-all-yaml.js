/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */
const { updateYamlFromEnvs, readZoweYaml } = require('../../src/libs/yaml');
const { readEnvFile, loadCertificateEnv } = require('../../src/libs/instance-env');
const fs = require('fs');
const tmp = require('tmp');
const _ = require('lodash');
const { getYamlResource, getInstanceEnvResource } = require('../utils');
const { expect } = require('chai');

describe('test update yaml file with all env variables', function () {

    let tmpFile;

    beforeEach = () =>{
        tmpFile = null;
    }

    afterEach = () =>{
        if(tmpFile) {
            tmpFile.removeCallback();
        }
    }

    it('should return updated object', () =>{
        tmpFile = tmp.fileSync();
        fs.copyFileSync(getYamlResource('full'),tmpFile.name);
        let envs = readEnvFile(getInstanceEnvResource('cert'));
        if(envs['KEYSTORE_DIRECTORY']) {
            _.merge(envs,loadCertificateEnv(envs['KEYSTORE_DIRECTORY']));
        }
        updateYamlFromEnvs(envs, tmpFile.name);
        const result = readZoweYaml(tmpFile.name);
        expect(_.get(result,'zowe.gatewayInternalPort')).to.equal('8080');
    })
}

)