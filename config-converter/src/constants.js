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

const VERBOSE_ENV = 'ZOWE_CONFIG_CONVERTER_VERBOSE';

const DEFAULT_YAML_INDENT = 2;

const DEFAULT_ZOWE_CORE_COMPONENTS = 'gateway,discovery,api-catalog,app-server,zss,jobs-api,files-api,explorer-jes,explorer-mvs,explorer-uss';
const DEFAULT_ZOWE_COMPONENT_GROUPS = {
  DESKTOP: 'app-server,zss',
  GATEWAY: 'gateway,discovery,api-catalog,jobs-api,files-api',
};

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
        _.set(yamlConfig, `components.${one}.enabled`, 'true');
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
const INSTANCE_ENV_VAR_MAPPING = {
  // EXTERNAL_ROOT_CA: ""
  // KEYSTORE_DIRECTORY: "/ZOWE/tmp/keystore",
  // SSO_FALLBACK_TO_NATIVE_AUTH: "true"
  // ZOWE_IP_ADDRESS: "148.100.36.148",
  // ZWE_DISCOVERY_SERVICES_LIST: "https://zzow01.zowe.marist.cloud:7553/eureka/",
  // ZWED_*: "ZWETOKEN",
  APIML_ALLOW_ENCODED_SLASHES: "components.gateway.allowEncodedSlashes",
  APIML_CORS_ENABLED: "components.gateway.corsEnabled",
  APIML_DEBUG_MODE_ENABLED: ["components.gateway.debug", "components.discovery.debug", "components.api-catalog.debug"],
  PIML_ENABLE_SSO: false,
  APIML_GATEWAY_TIMEOUT_MILLIS: "components.gateway.timeoutMillis",
  APIML_MAX_CONNECTIONS_PER_ROUTE: "components.gateway.maxConnectionsPerRoute",
  APIML_MAX_TOTAL_CONNECTIONS: "components.gateway.totalConnections",
  APIML_PREFER_IP_ADDRESS: "components.api-catalog.preferIpAddress",
  APIML_SECURITY_AUTH_PROVIDER: "components.gateway.auth.provider",
  APIML_SECURITY_X509_ENABLED: "components.gateway.x509Enabled",
  APIML_SECURITY_ZOSMF_APPLID: "zOSMF.applId",
  CATALOG_PORT: "components.api-catalog.port",
  DISCOVERY_PORT: "components.discovery.port",
  EXTERNAL_CERTIFICATE_AUTHORITIES: "externalCertificate.trustStore.certificateAuthorities",
  EXTERNAL_COMPONENTS: function(val, envs, yamlConfig) {
    enableComponents(val, yamlConfig);
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
  LAUNCH_COMPONENT_GROUPS: function(val, envs, yamlConfig) {
    if (envs['ZWE_LAUNCH_COMPONENTS']) {
      // prefer to use ZWE_LAUNCH_COMPONENTS
      return;
    }

    let components = '';
    const gateway = val.indexOf('GATEWAY') > -1;
    const desktop = val.indexOf('DESKTOP') > -1;
    if (gateway && desktop) {
      components = DEFAULT_ZOWE_CORE_COMPONENTS;
    } else if (gateway) {
      components = DEFAULT_ZOWE_COMPONENT_GROUPS['GATEWAY'];
    } else if (desktop) {
      components = DEFAULT_ZOWE_COMPONENT_GROUPS['DESKTOP'];
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
  STATIC_DEF_CONFIG_DIR: "components.discovery.staticDefinitionsDirectories",
  TRUSTSTORE: "externalCertificate.trustStore.file",
  USS_EXPLORER_UI_PORT: "components.explorer-uss.port",
  ZOSMF_HOST: "zOSMF.host",
  ZOSMF_PORT: "zOSMF.port",
  ZOWE_APIM_VERIFY_CERTIFICATES: "components.gateway.verifyCertificates",
  ZOWE_CACHING_SERVICE_START: "components.caching-service.enabled",
  ZOWE_EXPLORER_FRAME_ANCESTORS: ["components.explorer-jes.frameAncestors", "components.explorer-mvs.frameAncestors", "components.explorer-uss.frameAncestors"],
  ZOWE_EXPLORER_HOST: function(val, envs, yamlConfig) {
    appendToArray(val, "zowe.externalDomains", yamlConfig);
  },
  ZWE_EXTENSION_DIR: "zowe.extensionDirectory",
  ZOWE_INSTANCE: "zowe.identifier",
  ZOWE_PREFIX: function(val, envs, yamlConfig) {
    _.set(yamlConfig, 'zowe.jobPrefix', `${val}${envs['ZOWE_INSTANCE']}`);
  },
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
  ZWE_LAUNCH_COMPONENTS: function(val, envs, yamlConfig) {
    enableComponents(val, yamlConfig);
  },
  ZWE_ENVIRONMENT_PREPARED: false,
  ZWE_EXTERNAL_HOSTS: function(val, envs, yamlConfig) {
    appendToArray(val, "zowe.externalDomains", yamlConfig);
  },
  ZWE_LOG_LEVEL_ZWELS: "zowe.launchScript.logLevel",
  ZWEAD_EXTERNAL_STATIC_DEF_DIRECTORIES: "components.discovery.alternativeStaticDefinitionsDirectories",
};

module.exports = {
  VERBOSE_ENV,
  DEFAULT_YAML_INDENT,
  DEFAULT_ZOWE_COMPONENT_GROUPS,
  DEFAULT_ZOWE_CORE_COMPONENTS,
  INSTANCE_ENV_VAR_MAPPING,
};
