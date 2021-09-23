/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

// const debug = require('debug')('zct-test:cli');

const { testCertificateTool } = require('./utils');

describe('zct CLI commands', function () {
  it('should show usage help when no arguments are provided', () => {
    testCertificateTool([], {
      rc: 1,
      stdout: '',
      stderr: /^Not enough non-option arguments:/,
    });
  });
});
