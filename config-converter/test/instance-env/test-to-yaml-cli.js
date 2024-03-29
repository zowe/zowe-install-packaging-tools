/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const debug = require('debug')('zcc-test:instance-env:to-yaml-cli');

const { expect } = require('chai');
const _ = require('lodash');

const { STDOUT_YAML_SEPARATOR } = require('../../src/constants');
const { readZoweYaml } = require('../../src/libs/yaml');
const { getInstanceEnvResource, testConfigConverter, reformatYaml } = require('../utils');
const tmp = require('tmp');

describe('zcc instance-env to-yaml', function () {
  const cliParams = ['instance-env', 'to-yaml'];

  let tmpfile;

  beforeEach(() => {
    tmpfile = null;
  });

  afterEach(() => {
    if (tmpfile) {
      tmpfile.removeCallback();
    }
  });

  it('should show error when input file doesn\'t exist', () => {
    testConfigConverter([...cliParams, getInstanceEnvResource('category-doesnot-exist')], {
      rc: 1,
      stdout: '',
      stderr: ['Error reading file', 'ENOENT: no such file or directory'],
    });
  });

  it('should return converted YAML string with valid instance.env input', () => {
    testConfigConverter([...cliParams, getInstanceEnvResource('simple')], {
      stdout: reformatYaml(getInstanceEnvResource('simple', 'result.yaml')),
      stderr: '',
      yaml: {
        'zowe.runtimeDirectory': '/ZOWE/staging/zowe',
        'zowe.jobPrefix': 'ZWE',
        'zowe.identifier': "1",
      }
    }, true);
  });

  it('should write converted YAML file with valid instance.env input', () => {
    tmpfile = tmp.fileSync();
    debug('temporary file created: %s', tmpfile.name);
    testConfigConverter([...cliParams, '-o', tmpfile.name, getInstanceEnvResource('simple')], {
      stdout: '',
      stderr: ''
    }, true);

    const result = readZoweYaml(tmpfile.name);
    debug(result);

    expect(result).to.be.an('object');
    expect(_.get(result, 'zowe.runtimeDirectory')).to.equal('/ZOWE/staging/zowe');
    expect(_.get(result, 'zowe.jobPrefix')).to.equal('ZWE');
    expect(_.get(result, 'zowe.identifier')).to.equal('1');
  });

  it('should show error if cannot source instance.env file', () => {
    testConfigConverter([...cliParams, getInstanceEnvResource('invalid')], {
      rc: 1,
      stderr: ['Error reading file', 'Invalid env line'],
    });
  });

  it('should show verbose information if -v is provided', () => {
    testConfigConverter([...cliParams, '-v', getInstanceEnvResource('simple')], {
      stdout: ['CLI arguments:', STDOUT_YAML_SEPARATOR, 'Ignore key SKIP_NODE with value "0"', 'Unknown key UNKNOWN_KEY with value "value"'],
      stderr: '',
      yaml: {
        'components.gateway.apiml.security.ssl.verifySslCertificatesOfServices': true,
        'components.gateway.debug': false,
        'components.gateway.apiml.security.x509.enabled': false,
        'components.gateway.apiml.security.auth.provider': 'zosmf',
        'components.gateway.apiml.service.allowEncodedSlashes': true,
        'components.gateway.apiml.service.corsEnabled': false,
        'components.discovery.debug': false,
        'components.api-catalog.debug': false,
        'components.api-catalog.environment.preferIpAddress': true,
        'zowe.environments.UNKNOWN_KEY': 'value',
      }
    });
  });

  it('should enable all components if LAUNCH_COMPONENT_GROUPS=DESKTOP,GATEWAY', () => {
    testConfigConverter([...cliParams, '-v', getInstanceEnvResource('components-all')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': true,
        'components.gateway.enabled': true,
        'components.explorer-jes.enabled': true,
      }
    }, true);
  });

  it('should enable only desktop components if LAUNCH_COMPONENT_GROUPS=DESKTOP', () => {
    testConfigConverter([...cliParams, '-v', getInstanceEnvResource('components-desktop')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': true,
        'components.gateway.enabled': undefined,
        'components.explorer-jes.enabled': undefined,
      }
    }, true);
  });

  it('should enable only gateway components if LAUNCH_COMPONENT_GROUPS=GATEWAY', () => {
    testConfigConverter([...cliParams, '-v', getInstanceEnvResource('components-gateway')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': undefined,
        'components.gateway.enabled': true,
        'components.explorer-jes.enabled': true,
      }
    }, true);
  });

  it('should ignore LAUNCH_COMPONENT_GROUPS if ZWE_LAUNCH_COMPONENTS is defined', () => {
    testConfigConverter([...cliParams, getInstanceEnvResource('components-custom')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': undefined,
        'components.gateway.enabled': undefined,
        'components.explorer-jes.enabled': undefined,
        'components.zss.enabled': true,
        'components.abc.enabled': true,
      }
    }, true);
  });

  it('should show warning if component is path', () => {
    testConfigConverter([...cliParams, '-v', getInstanceEnvResource('components-invalid')], {
      stdout: 'Unsupported component value "/path/to/a/component/bin"',
      stderr: '',
      yaml: {
        'components.compname.enabled': true,
        'components.extcomp.enabled': true,
      }
    });
  });

  it('should ignore those components if component is path', () => {
    testConfigConverter([...cliParams, getInstanceEnvResource('components-invalid')], {
      stderr: '',
      yaml: {
        'components.compname.enabled': true,
        'components.extcomp.enabled': true,
      }
    }, true);
  });

  it('should add all domains as array if ZWE_EXTERNAL_HOSTS is defined', () => {
    testConfigConverter([...cliParams, getInstanceEnvResource('multiple-hosts')], {
      stderr: '',
      stdout: reformatYaml(getInstanceEnvResource('multiple-hosts', 'result.yaml')),
    }, true);
  });

  it('should load keystore definition if KEYSTORE_DIRECTORY is defined', () => {
    testConfigConverter([...cliParams, getInstanceEnvResource('cert')], {
      stderr: '',
      yaml: {
        'zowe.certificate.keystore.file': '/var/zowe/keystore/localhost/localhost.keystore.p12',
      }
    }, true);
  });

  it('should show error if KEYSTORE_DIRECTORY is invalid', () => {
    testConfigConverter([...cliParams, getInstanceEnvResource('cert-no-env')], {
      rc: 1,
      stderr: ['Error loading keystore configs', 'doesn\'t have "zowe-certificates.env" file'],
    });
  });

  it('should have a full set of configuration but only zss enabled', () => {
    testConfigConverter([...cliParams, '-v', getInstanceEnvResource('zss')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': undefined,
        'components.gateway.enabled': undefined,
        'components.gateway.apiml.security.ssl.nonStrictVerifySslCertificatesOfServices': false,
        'components.zss.enabled': true,
        'components.zss.tls': true,
      }
    }, true);
  });
});
