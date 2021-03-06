/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

// const debug = require('debug')('zcc-test:convert-configs');

const { getYamlResource, testConfigConverter } = require('../utils');

describe('test zcc yaml read', function () {
  const cliParams = ['yaml', 'read'];
  const resourceCategory = 'ha-instances';

  it('should display the parsed YAML file content as JSON format', () => {
    testConfigConverter([...cliParams, getYamlResource(resourceCategory)], {
      rc: 0,
      stdout: [
        '"runtimeDirectory": "/ZOWE/staging/zowe"',
        '"domain": "my-first-zos.com"',
      ],
      stderr: '',
    });
  });

  it('should show verbose information if -v is specified', () => {
    testConfigConverter([...cliParams, '-v', getYamlResource(resourceCategory)], {
      rc: 0,
      stdout: [
        'CLI arguments',
        'Reading',
        '"runtimeDirectory": "/ZOWE/staging/zowe"',
        '"domain": "my-first-zos.com"',
      ],
      stderr: '',
    });
  });

});
