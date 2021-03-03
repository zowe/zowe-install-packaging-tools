/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2020
 */

// const debug = require('debug')('config-converter:env-to-yaml');

const { STDOUT_YAML_SEPARATOR } = require('../../src/constants');
const { getResource, testConfigConverter, readYaml } = require('../utils');

describe('zcc instance-env to-yaml', function () {
  const cliParams = ['instance-env', 'to-yaml'];

  it('should show error when input file doesn\'t exist', () => {
    testConfigConverter([...cliParams, getResource('category-doesnot-exist')], {
      rc: 1,
      stdout: '',
      stderr: ['Error reading file', 'ENOENT: no such file or directory'],
    });
  });

  it('should return converted YAML string with valid instance.env input', () => {
    testConfigConverter([...cliParams, getResource('simple')], {
      stdout: readYaml(getResource('simple', 'result.yaml')),
      stderr: '',
      yaml: {
        'zowe.runtimeDirectory': '/ZOWE/staging/zowe',
        'zowe.jobPrefix': 'ZWE1',
        'zowe.identifier': "1",
      }
    }, true);
  });

  it('should show error if cannot source instance.env file', () => {
    testConfigConverter([...cliParams, getResource('invalid')], {
      rc: 1,
      stderr: ['Error reading file', 'Invalid env line'],
    });
  });

  it('should show verbose information if -v is provided', () => {
    testConfigConverter([...cliParams, '-v', getResource('simple')], {
      stdout: ['CLI arguments:', STDOUT_YAML_SEPARATOR, 'Ignore key SKIP_NODE with value "0"', 'Unknown key UNKNOWN_KEY with value "value"'],
      stderr: '',
      yaml: {
        'components.gateway.debug': 'false',
        'components.discovery.debug': 'false',
        'components.api-catalog.debug': 'false',
        'zowe.environments.UNKNOWN_KEY': 'value',
      }
    });
  });

  it('should enable all components if LAUNCH_COMPONENT_GROUPS=DESKTOP,GATEWAY', () => {
    testConfigConverter([...cliParams, '-v', getResource('components-all')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': 'true',
        'components.gateway.enabled': 'true',
        'components.explorer-jes.enabled': 'true',
      }
    }, true);
  });

  it('should enable only desktop components if LAUNCH_COMPONENT_GROUPS=DESKTOP', () => {
    testConfigConverter([...cliParams, '-v', getResource('components-desktop')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': 'true',
        'components.gateway.enabled': undefined,
        'components.explorer-jes.enabled': undefined,
      }
    }, true);
  });

  it('should enable only gateway components if LAUNCH_COMPONENT_GROUPS=GATEWAY', () => {
    testConfigConverter([...cliParams, '-v', getResource('components-gateway')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': undefined,
        'components.gateway.enabled': 'true',
        'components.explorer-jes.enabled': undefined,
      }
    }, true);
  });

  it('should ignore LAUNCH_COMPONENT_GROUPS if ZWE_LAUNCH_COMPONENTS is defined', () => {
    testConfigConverter([...cliParams, getResource('components-custom')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': undefined,
        'components.gateway.enabled': undefined,
        'components.explorer-jes.enabled': undefined,
        'components.zss.enabled': 'true',
        'components.abc.enabled': 'true',
      }
    }, true);
  });

  it('should show warning if component is path', () => {
    testConfigConverter([...cliParams, '-v', getResource('components-invalid')], {
      stdout: 'Unsupported component value "/path/to/a/component/bin"',
      stderr: '',
      yaml: {
        'components.compname.enabled': 'true',
        'components.extcomp.enabled': 'true',
      }
    });
  });

  it('should ignore those components if component is path', () => {
    testConfigConverter([...cliParams, getResource('components-invalid')], {
      stderr: '',
      yaml: {
        'components.compname.enabled': 'true',
        'components.extcomp.enabled': 'true',
      }
    }, true);
  });

  it('should add all domains as array if ZWE_EXTERNAL_HOSTS is defined', () => {
    testConfigConverter([...cliParams, getResource('multiple-hosts')], {
      stderr: '',
      stdout: readYaml(getResource('multiple-hosts', 'result.yaml')),
    }, true);
  });

  it('should load keystore definition if KEYSTORE_DIRECTORY is defined', () => {
    testConfigConverter([...cliParams, getResource('cert')], {
      stderr: '',
      yaml: {
        'externalCertificate.keystore.file': '/var/zowe/keystore/localhost/localhost.keystore.p12',
      }
    }, true);
  });

  it('should show error if KEYSTORE_DIRECTORY is invalid', () => {
    testConfigConverter([...cliParams, getResource('cert-no-env')], {
      rc: 1,
      stderr: ['Error loading keystore configs', 'doesn\'t have "zowe-certificates.env" file'],
    });
  });
});
