/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const util = require('util');
const _ = require('lodash');
const { VERBOSE_ENV, DEFAULT_ZOWE_COMPONENT_GROUPS, DEFAULT_ZOWE_CORE_COMPONENTS } = require('./index');

const enableComponents = (components, yamlConfig) => {
  components.split(/,/).forEach((one) => {
    one = one.trim();
    if (one !== '') {
      if (one.indexOf('/') > -1 || one.indexOf('\\') > -1) {
        // path to the component
        if (process.env[VERBOSE_ENV]) {
          process.stdout.write(util.format('Unsupported component value %j\n', one));
        }
      } else {
        _.set(yamlConfig, `components.${one}.enabled`, true);
      }
    }
  });
};

const appendToArray = (val, path, yamlConfig, separator = ",") => {
  if (!_.has(yamlConfig, path)) {
    _.set(yamlConfig, path, []);
  }

  val.split(separator).forEach((one) => {
    one = one.trim();

    if (one !== '') {
      const arr = _.get(yamlConfig, path);
      if (arr.indexOf(one) === -1) {
        _.set(yamlConfig, `${path}[${arr.length}]`, one);
      }
    }
  });
};

const stringToBoolean = (str) => {
  return str.toLowerCase() === 'true';
};

/**
 * Environment variable to YAML config mapping
 *
 * Supported values:
 * - false (boolean): this environment variable will be ignored
 * - string: YAML config key path
 * - array of string: array of YAML config key paths
 * - function: customized conversion method with 3 parameters:
 *             - variable value of current environment variable
 *             - full environment variables object
 *             - target YAML config object
 */
const ENV_TO_YAML_MAPPING = {
  // EXTERNAL_ROOT_CA: ""
  // KEYSTORE_DIRECTORY: "/ZOWE/tmp/keystore",
  // SSO_FALLBACK_TO_NATIVE_AUTH: "true"
  // ZOWE_IP_ADDRESS: "148.100.36.148",
  // ZWED_*: "ZWETOKEN",
  APIML_ALLOW_ENCODED_SLASHES: function(val, envs, yamlConfig) {
    _.set(yamlConfig, 'components.gateway.apiml.service.allowEncodedSlashes', stringToBoolean(val));
  },
  APIML_CORS_ENABLED: function(val, envs, yamlConfig) {
    _.set(yamlConfig, 'components.gateway.apiml.service.corsEnabled', stringToBoolean(val));
  },
  APIML_DEBUG_MODE_ENABLED:  function(val, envs, yamlConfig) {
    const bVal = stringToBoolean(val);
    _.set(yamlConfig, 'components.gateway.debug', bVal);
    _.set(yamlConfig, 'components.discovery.debug', bVal);
    _.set(yamlConfig, 'components.api-catalog.debug', bVal);
    _.set(yamlConfig, 'components.caching-service.debug', bVal);
  },
  APIML_ENABLE_SSO: false,
  APIML_GATEWAY_INTERNAL_HOST: "zowe.gatewayInternalHost",
  APIML_GATEWAY_INTERNAL_PORT: "zowe.gatewayInternalPort",
  APIML_GATEWAY_TIMEOUT_MILLIS: "components.gateway.apiml.gateway.timeoutMillis",
  // added by https://github.com/zowe/zowe-install-packaging/pull/2021
  APIML_GATEWAY_EXTERNAL_MAPPER: "components.gateway.apiml.security.x509.externalMapperUrl",
  APIML_MAX_CONNECTIONS_PER_ROUTE: "components.gateway.server.maxConnectionsPerRoute",
  APIML_MAX_TOTAL_CONNECTIONS: "components.gateway.server.maxTotalConnections",
  APIML_PREFER_IP_ADDRESS: function(val, envs, yamlConfig) {
    _.set(yamlConfig, 'components.gateway.apiml.service.preferIpAddress', stringToBoolean(val));
    _.set(yamlConfig, 'components.discovery.apiml.service.preferIpAddress', stringToBoolean(val));
    _.set(yamlConfig, 'components.api-catalog.environment.preferIpAddress', stringToBoolean(val));
    _.set(yamlConfig, 'components.caching-service.environment.preferIpAddress', stringToBoolean(val));
  },
  APIML_SECURITY_AUTH_PROVIDER: "components.gateway.apiml.security.auth.provider",
  // added by https://github.com/zowe/zowe-install-packaging/pull/2021
  APIML_SECURITY_AUTHORIZATION_ENDPOINT_URL: "components.gateway.apiml.security.authorization.endpoint.url",
  APIML_SECURITY_X509_ENABLED: function(val, envs, yamlConfig) {
    _.set(yamlConfig, 'components.gateway.apiml.security.x509.enabled', stringToBoolean(val));
  },
  APIML_SECURITY_ZOSMF_APPLID: ["zOSMF.applId", "components.gateway.apiml.security.zosmf.applid"],
  CATALOG_PORT: "components.api-catalog.port",
  DISCOVERY_PORT: "components.discovery.port",
  EXTERNAL_COMPONENTS: function(val, envs, yamlConfig) {
    enableComponents(val, yamlConfig);
  },
  FILES_API_PORT: "components.files-api.port",
  GATEWAY_PORT: ["zowe.externalPort", "components.gateway.port"],
  JAVA_HOME: "java.home",
  JAVA_OPTIONS: "java.options",
  JES_EXPLORER_UI_PORT: "components.explorer-jes.port",
  JOBS_API_PORT: "components.jobs-api.port",
  LAUNCH_COMPONENT_GROUPS: function(val, envs, yamlConfig) {
    if (envs['ZWE_LAUNCH_COMPONENTS']) {
      // prefer to use ZWE_LAUNCH_COMPONENTS
      return;
    }

    let components = '';
    const gateway = val.indexOf('GATEWAY') > -1;
    const desktop = val.indexOf('DESKTOP') > -1;
    if (gateway && desktop) {
      components = DEFAULT_ZOWE_CORE_COMPONENTS.join(',');
    } else if (gateway) {
      components = DEFAULT_ZOWE_COMPONENT_GROUPS['GATEWAY'].join(',');
    } else if (desktop) {
      components = DEFAULT_ZOWE_COMPONENT_GROUPS['DESKTOP'].join(',');
    }

    enableComponents(components, yamlConfig);
  },
  MVS_EXPLORER_UI_PORT: "components.explorer-mvs.port",
  NODE_HOME: "node.home",
  NODE_OPTIONS: "node.options",
  PKCS11_TOKEN_LABEL: "zowe.sso.token.label",
  PKCS11_TOKEN_NAME: "zowe.sso.token.name",
  ROOT_DIR: 'zowe.runtimeDirectory',
  SKIP_NODE: false,
  STATIC_DEF_CONFIG_DIR: "components.discovery.staticApiDefinitionsDirectories",
  USS_EXPLORER_UI_PORT: "components.explorer-uss.port",
  ZOSMF_HOST: "zOSMF.host",
  ZOSMF_PORT: "zOSMF.port",
  ZOWE_APIM_VERIFY_CERTIFICATES: function(val, envs, yamlConfig) {
    _.set(yamlConfig, 'components.gateway.apiml.security.ssl.verifySslCertificatesOfServices', stringToBoolean(val));
    _.set(yamlConfig, 'components.discovery.apiml.security.ssl.verifySslCertificatesOfServices', stringToBoolean(val));
    _.set(yamlConfig, 'components.gateway.apiml.security.ssl.verifySslCertificatesOfServices', stringToBoolean(val));
    _.set(yamlConfig, 'components.caching-service.apiml.security.ssl.verifySslCertificatesOfServices', stringToBoolean(val));
  },
  // this will be generated by components.discovery.enabled
  ZWE_DISCOVERY_SERVICES_LIST: false,
  ZOWE_EXPLORER_FRAME_ANCESTORS: ["components.explorer-jes.frameAncestors", "components.explorer-mvs.frameAncestors", "components.explorer-uss.frameAncestors"],
  ZOWE_EXPLORER_HOST: function(val, envs, yamlConfig) {
    appendToArray(val, "zowe.externalDomains", yamlConfig);
  },
  ZWE_EXTENSION_DIR: "zowe.extensionDirectory",
  ZOWE_INSTANCE: "zowe.identifier",
  ZOWE_LOOPBACK_ADDRESS: "zowe.loopbackIp",
  ZOWE_PREFIX: 'zowe.jobPrefix',
  // ZOWE_ZLUX_SECURITY_TYPE: "components.app-server.plugins.tn3270.security",
  ZOWE_ZLUX_SERVER_HTTPS_PORT: "components.app-server.port",
  // ZOWE_ZLUX_SSH_PORT: "components.app-server.plugins.vt-term.port",
  // ZOWE_ZLUX_TELNET_PORT: "components.app-server.plugins.tn3270.port",
  ZOWE_ZSS_SERVER_PORT: "components.zss.port",
  ZOWE_ZSS_XMEM_SERVER_NAME: "components.zss.crossMemoryServerName",
  ZWE_CACHING_EVICTION_STRATEGY: "components.caching-service.storage.evictionStrategy",
  ZWE_CACHING_SERVICE_PERSISTENT: "components.caching-service.storage.mode",
  ZWE_CACHING_SERVICE_PORT: "components.caching-service.port",
  ZWE_CACHING_SERVICE_VSAM_DATASET: "components.caching-service.storage.vsam.name",
  ZWE_CACHING_STORAGE_SIZE: "components.caching-service.storage.size",
  ZWE_LAUNCH_COMPONENTS: function(val, envs, yamlConfig) {
    enableComponents(val, yamlConfig);
  },
  ZWE_ENVIRONMENT_PREPARED: false,
  ZWE_EXTERNAL_HOSTS: function(val, envs, yamlConfig) {
    appendToArray(val, "zowe.externalDomains", yamlConfig);
  },
  ZWE_REFERRER_HOSTS: function(val, envs, yamlConfig) {
    appendToArray(val, "zowe.referrerHosts", yamlConfig);
  },
  ZWE_LOG_LEVEL_ZWELS: "zowe.launchScript.logLevel",
  ZWEAD_EXTERNAL_STATIC_DEF_DIRECTORIES: "components.discovery.alternativeStaticApiDefinitionsDirectories",

  // certificate
  EXTERNAL_CERTIFICATE_AUTHORITIES: ["zowe.externalCertificate.trustStore.certificateAuthorities", "zowe.internalCertificate.trustStore.certificateAuthorities"],
  KEY_ALIAS: ["zowe.externalCertificate.keystore.alias", "zowe.internalCertificate.keystore.alias"],
  KEYSTORE_CERTIFICATE_AUTHORITY: ["zowe.externalCertificate.pem.certificateAuthority", "zowe.internalCertificate.pem.certificateAuthority"],
  KEYSTORE_CERTIFICATE: ["zowe.externalCertificate.pem.certificate", "zowe.internalCertificate.pem.certificate"],
  KEYSTORE_KEY: ["zowe.externalCertificate.pem.key", "zowe.internalCertificate.pem.key"],
  KEYSTORE_PASSWORD: ["zowe.externalCertificate.keystore.password", "zowe.internalCertificate.keystore.password"],
  KEYSTORE_TYPE: ["zowe.externalCertificate.keystore.type", "zowe.internalCertificate.keystore.type"],
  KEYSTORE: ["zowe.externalCertificate.keystore.file", "zowe.internalCertificate.keystore.file"],
  TRUSTSTORE: ["zowe.externalCertificate.trustStore.file", "zowe.internalCertificate.trustStore.file"],
};

module.exports = {
  ENV_TO_YAML_MAPPING,
};
