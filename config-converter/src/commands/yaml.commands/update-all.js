/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const { updateYamlFromEnvs } = require('../../libs/yaml')
const { readEnvFile, loadCertificateEnv } = require('../../libs/instance-env');
const _ = require('lodash');
const builder = (yargs) => {
    yargs.options({});
}

const handler = async (options) => {
    const instanceFile = options.instanceEnvFile;
    const yamlFile = options.yamlFile;
    let envs = readEnvFile(instanceFile);
    if (envs['KEYSTORE_DIRECTORY']) {
        _.merge(envs, loadCertificateEnv(envs['KEYSTORE_DIRECTORY']));
    }
    
    updateYamlFromEnvs(envs, yamlFile);
}

module.exports = {
    command: 'update-all <instance-env-file> <yaml-file>',
    description: 'Update yaml file with all values from instance.env.',
    builder,
    handler,
}