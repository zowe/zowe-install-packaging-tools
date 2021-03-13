/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const VERBOSE_ENV = 'ZOWE_CONFIG_CONVERTER_VERBOSE';

const DEFAULT_JSON_INDENT = 2;
const DEFAULT_YAML_INDENT = 2;
const STDOUT_YAML_SEPARATOR = '========== Converted YAML configuration ==========';

const DEFAULT_ZOWE_CORE_COMPONENTS = ['gateway', 'discovery', 'api-catalog', 'app-server', 'zss', 'jobs-api', 'files-api', 'explorer-jes', 'explorer-mvs', 'explorer-uss'];
const DEFAULT_ZOWE_CORE_COMPONENT_CANDIDATES = ['caching-service'];
const DEFAULT_ZOWE_COMPONENT_GROUPS = {
  DESKTOP: ['app-server', 'zss'],
  GATEWAY: ['gateway', 'discovery', 'api-catalog', 'jobs-api', 'files-api', 'explorer-jes', 'explorer-mvs', 'explorer-uss'],
};

const DEFAULT_HA_INSTANCE_ID = 'default';

const DEFAULT_NEW_FILE_MODE = 0o640;

module.exports = {
  VERBOSE_ENV,
  DEFAULT_JSON_INDENT,
  DEFAULT_YAML_INDENT,
  STDOUT_YAML_SEPARATOR,
  DEFAULT_ZOWE_COMPONENT_GROUPS,
  DEFAULT_ZOWE_CORE_COMPONENTS,
  DEFAULT_ZOWE_CORE_COMPONENT_CANDIDATES,
  DEFAULT_HA_INSTANCE_ID,
  DEFAULT_NEW_FILE_MODE,
};
