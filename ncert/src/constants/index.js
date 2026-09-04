/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const VERBOSE_ENV = 'ZOWE_CERTIFICATE_TOOL_VERBOSE';

const DEFAULT_JSON_INDENT = 2;

// used for files that may contain private key material (PKCS#12 keystores, exported PEM keys)
const DEFAULT_PRIVATE_KEY_FILE_MODE = 0o640;

module.exports = {
  VERBOSE_ENV,
  DEFAULT_JSON_INDENT,
  DEFAULT_PRIVATE_KEY_FILE_MODE,
};
