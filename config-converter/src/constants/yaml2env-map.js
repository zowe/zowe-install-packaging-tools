/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const _ = require('lodash');
const { DEFAULT_ZOWE_CORE_COMPONENTS, DEFAULT_ZOWE_CORE_COMPONENT_CANDIDATES } = require('./index');

const getBooleanVal = (obj, path) => {
  const val = _.get(obj, path);
  return _.isUndefined(val) ? val : `${val}`;
};

/**
 * YAML config to instance env mapping
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
const YAML_TO_ENV_MAPPING = {
  // EXTERNAL_ROOT_CA: ""
  // KEYSTORE_DIRECTORY: "/ZOWE/tmp/keystore",
  // SSO_FALLBACK_TO_NATIVE_AUTH: "true"
  // ZOWE_IP_ADDRESS: "148.100.36.148",
  // ZWE_DISCOVERY_SERVICES_LIST: "https://zzow01.zowe.marist.cloud:7553/eureka/",
  // ZWED_*: "ZWETOKEN",
  APIML_ALLOW_ENCODED_SLASHES: function(zoweYaml, yamlConfig) {
    return getBooleanVal(yamlConfig, 'components.gateway.allowEncodedSlashes');
  },
  APIML_CORS_ENABLED: function(zoweYaml, yamlConfig) {
    return getBooleanVal(yamlConfig, 'components.gateway.corsEnabled');
  },
  APIML_DEBUG_MODE_ENABLED:  function(zoweYaml, yamlConfig) {
    const bVal = _.get(yamlConfig, 'components.gateway.debug');
    if (_.get(yamlConfig, 'components.discovery.debug') !== bVal) {
      process.stderr.write(`WARNING: <workspace-dir>/${zoweYaml} value of components.discovery.debug is not same as other sibling configs\n`);
    }
    if (_.get(yamlConfig, 'components.api-catalog.debug') !== bVal) {
      process.stderr.write(`WARNING: <workspace-dir>/${zoweYaml} value of components.api-catalog.debug is not same as other sibling configs\n`);
    }
    return bVal;
  },
  APIML_ENABLE_SSO: false,
  APIML_GATEWAY_TIMEOUT_MILLIS: "components.gateway.timeoutMillis",
  APIML_MAX_CONNECTIONS_PER_ROUTE: "components.gateway.maxConnectionsPerRoute",
  APIML_MAX_TOTAL_CONNECTIONS: "components.gateway.totalConnections",
  APIML_PREFER_IP_ADDRESS: function(zoweYaml, yamlConfig) {
    return getBooleanVal(yamlConfig, 'components.api-catalog.preferIpAddress');
  },
  APIML_SECURITY_AUTH_PROVIDER: "components.gateway.auth.provider",
  APIML_SECURITY_X509_ENABLED: function(zoweYaml, yamlConfig) {
    return getBooleanVal(yamlConfig, 'components.gateway.x509Enabled');
  },
  APIML_SECURITY_ZOSMF_APPLID: "zOSMF.applId",
  CATALOG_PORT: "components.api-catalog.port",
  DISCOVERY_PORT: "components.discovery.port",
  EXTERNAL_CERTIFICATE_AUTHORITIES: "externalCertificate.trustStore.certificateAuthorities",
  EXTERNAL_COMPONENTS: function(zoweYaml, yamlConfig) {
    const val = [];
    if (yamlConfig.components) {
      for (const component in yamlConfig.components) {
        if (DEFAULT_ZOWE_CORE_COMPONENTS.indexOf(component) === -1 && DEFAULT_ZOWE_CORE_COMPONENT_CANDIDATES.indexOf(component) === -1) {
          if (yamlConfig.components[component].enabled) {
            val.push(component);
          }
        }
      }
    }
    return val.join(',');
  },
  FILES_API_PORT: "components.files-api.port",
  GATEWAY_PORT: ["zowe.externalPort", "components.gateway.port"],
  JAVA_HOME: "java.home",
  JAVA_OPTIONS: "java.options",
  JES_EXPLORER_UI_PORT: "components.explorer-jes.port",
  JOBS_API_PORT: "components.jobs-api.port",
  KEY_ALIAS: "externalCertificate.keystore.keyAlias",
  KEYSTORE_CERTIFICATE_AUTHORITY: "externalCertificate.pem.certificateAuthority",
  KEYSTORE_CERTIFICATE: "externalCertificate.pem.certificate",
  KEYSTORE_KEY: "externalCertificate.pem.key",
  KEYSTORE_PASSWORD: "externalCertificate.keystore.password",
  KEYSTORE_TYPE: "externalCertificate.keystore.type",
  KEYSTORE: "externalCertificate.keystore.file",
  LAUNCH_COMPONENT_GROUPS: function() {
    // will use ZWE_LAUNCH_COMPONENTS
    return 'dummy';
  },
  MVS_EXPLORER_UI_PORT: "components.explorer-mvs.port",
  NODE_HOME: "node.home",
  NODE_OPTIONS: "node.options",
  PKCS11_TOKEN_LABEL: "zowe.sso.token.label",
  PKCS11_TOKEN_NAME: "zowe.sso.token.name",
  ROOT_DIR: 'zowe.runtimeDirectory',
  SKIP_NODE: false,
  STATIC_DEF_CONFIG_DIR: "components.discovery.staticDefinitionsDirectories",
  TRUSTSTORE: "externalCertificate.trustStore.file",
  USS_EXPLORER_UI_PORT: "components.explorer-uss.port",
  ZOSMF_HOST: "zOSMF.host",
  ZOSMF_PORT: "zOSMF.port",
  ZOWE_APIM_VERIFY_CERTIFICATES: function(zoweYaml, yamlConfig) {
    return getBooleanVal(yamlConfig, 'components.gateway.verifyCertificates');
  },
  ZOWE_CACHING_SERVICE_START: function(zoweYaml, yamlConfig) {
    return getBooleanVal(yamlConfig, 'components.caching-service.enabled');
  },
  ZOWE_EXPLORER_FRAME_ANCESTORS: ["components.explorer-jes.frameAncestors", "components.explorer-mvs.frameAncestors", "components.explorer-uss.frameAncestors"],
  ZOWE_EXPLORER_HOST: function(zoweYaml, yamlConfig) {
    return _.get(yamlConfig, 'zowe.externalDomains.0') || '';
  },
  ZWE_EXTENSION_DIR: "zowe.extensionDirectory",
  ZOWE_INSTANCE: "zowe.identifier",
  ZOWE_PREFIX: 'zowe.jobPrefix',
  // ZOWE_ZLUX_SECURITY_TYPE: "components.app-server.plugins.tn3270.security",
  ZOWE_ZLUX_SERVER_HTTPS_PORT: "components.app-server.port",
  // ZOWE_ZLUX_SSH_PORT: "components.app-server.plugins.vt-term.port",
  // ZOWE_ZLUX_TELNET_PORT: "components.app-server.plugins.tn3270.port",
  ZOWE_ZSS_SERVER_PORT: "components.zss.port",
  ZOWE_ZSS_XMEM_SERVER_NAME: "components.zss.crossMemoryServerName",
  ZWE_CACHING_EVICTION_STRATEGY: "components.caching-service.evictionStrategy",
  ZWE_CACHING_SERVICE_PERSISTENT: "components.caching-service.persistent",
  ZWE_CACHING_SERVICE_PORT: "components.caching-service.port",
  ZWE_CACHING_SERVICE_VSAM_DATASET: "components.caching-service.vsam.dataset",
  ZWE_CACHING_STORAGE_SIZE: "components.caching-service.vsam.storageSize",
  ZWE_LAUNCH_COMPONENTS: function(zoweYaml, yamlConfig) {
    const val = [];
    if (yamlConfig.components) {
      for (const component in yamlConfig.components) {
        if (DEFAULT_ZOWE_CORE_COMPONENTS.indexOf(component) > -1) {
          if (yamlConfig.components[component].enabled) {
            val.push(component);
          }
        }
      }
    }
    return val.join(',');
  },
  ZWE_ENVIRONMENT_PREPARED: false,
  // ZWE_EXTERNAL_HOSTS: function(zoweYaml, yamlConfig) {
  //   const val = _.get(yamlConfig, 'zowe.externalDomains') || [];
  //   return val.join(',');
  // },
  ZWE_LOG_LEVEL_ZWELS: "zowe.launchScript.logLevel",
  ZWEAD_EXTERNAL_STATIC_DEF_DIRECTORIES: "components.discovery.alternativeStaticDefinitionsDirectories",
};

module.exports = {
  YAML_TO_ENV_MAPPING,
};
