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

const getCertificateConfig = (configObj) => {
  return (configObj.configs && configObj.configs.certificate) ||
    (configObj.zowe && configObj.zowe.internalCertificate) ||
    (configObj.zowe && configObj.zowe.externalCertificate) ||
    null;
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
  separator_10: '\n',
  comment_10: '# global config',
  ROOT_DIR: 'zowe.runtimeDirectory',
  ZOWE_PREFIX: 'zowe.jobPrefix',
  ZOWE_INSTANCE: "zowe.identifier",

  separator_20: '\n',
  comment_20: '# Comma separated list of components should start from [GATEWAY,DESKTOP]',
  LAUNCH_COMPONENT_GROUPS: function(yamlConfigObj) {
    // IMPORTANT: this value is not accurate anymore since we are more flexible to control what components can be started
    // component should check ZWE_LAUNCH_COMPONENTS instead
    let groups = [];
    if (_.get(yamlConfigObj, 'components.gateway.enabled')) {
      groups.push('GATEWAY');
    }
    if (_.get(yamlConfigObj, 'components.app-server.enabled')) {
      groups.push('DESKTOP');
    }
    if (_.get(yamlConfigObj, 'components.zss.enabled')) {
      groups.push('ZSS');
    }
    return groups.join(',');
  },
  ZWE_LAUNCH_COMPONENTS: function(yamlConfigObj) {
    const val = [];
    if (yamlConfigObj.components) {
      for (const component in yamlConfigObj.components) {
        if (DEFAULT_ZOWE_CORE_COMPONENTS.indexOf(component) > -1) {
          if (yamlConfigObj.components[component].enabled) {
            val.push(component);
          }
        }
      }
    }
    return val.join(',');
  },

  separator_30: '\n',
  comment_30: '# language configs',
  JAVA_HOME: "java.home",
  JAVA_OPTIONS: "java.options",
  NODE_HOME: "node.home",
  NODE_OPTIONS: "node.options",

  separator_40: '\n',
  comment_40: '# Set to 1 to skip using nodejs. This can only be done if the zowe components used have no nodejs dependency',
  SKIP_NODE: false,

  separator_50: '\n',
  comment_50: '# z/OS MF config',
  ZOSMF_HOST: "zOSMF.host",
  ZOSMF_PORT: "zOSMF.port",

  ZOWE_EXPLORER_HOST: function(yamlConfigObj) {
    return _.get(yamlConfigObj, 'haInstance.hostname') || _.get(yamlConfigObj, 'zowe.externalDomains.0') || '';
  },
  // ZOWE_IP_ADDRESS: "148.100.36.148",

  separator_100: '\n',
  comment_100: '# APIML variables',
  CATALOG_PORT: "components.api-catalog.port",
  DISCOVERY_PORT: "components.discovery.port",
  GATEWAY_PORT: ["zowe.externalPort", "components.gateway.port"],
  APIML_ALLOW_ENCODED_SLASHES: function(yamlConfigObj) {
    return getBooleanVal(yamlConfigObj, 'components.gateway.allowEncodedSlashes');
  },
  APIML_CORS_ENABLED: function(yamlConfigObj) {
    return getBooleanVal(yamlConfigObj, 'components.gateway.corsEnabled');
  },
  APIML_PREFER_IP_ADDRESS: function(yamlConfigObj) {
    return getBooleanVal(yamlConfigObj, 'components.api-catalog.preferIpAddress');
  },
  APIML_GATEWAY_TIMEOUT_MILLIS: "components.gateway.timeoutMillis",
  APIML_SECURITY_X509_ENABLED: function(yamlConfigObj) {
    return getBooleanVal(yamlConfigObj, 'components.gateway.x509Enabled');
  },
  APIML_SECURITY_ZOSMF_APPLID: "zOSMF.applId",
  APIML_SECURITY_AUTH_PROVIDER: "components.gateway.auth.provider",
  // List of discovery service URLs separated by comma
  ZWE_DISCOVERY_SERVICES_LIST: function(yamlConfigObj) {
    const val = [];
    const defaultEnabled = _.get(yamlConfigObj, 'components.discovery.enabled');
    const defaultPort = _.get(yamlConfigObj, 'components.discovery.port');
    const defaultExternalDomain = _.get(yamlConfigObj, 'zowe.externalDomains.0') || '';
    if (yamlConfigObj.haInstances) {
      for (const haInstanceId in yamlConfigObj.haInstances) {
        const haInstanceConfig = yamlConfigObj.haInstances[haInstanceId];
        const haInstanceHostname = haInstanceConfig.hostname || defaultExternalDomain;
        let hasDiscoveryInThisInstance = false;
        if (haInstanceConfig.discovery && _.has(haInstanceConfig.discovery, 'enabled')) {
          hasDiscoveryInThisInstance = _.get(haInstanceConfig.discovery, 'enabled');
        } else {
          hasDiscoveryInThisInstance = defaultEnabled;
        }

        let discoveryPort = defaultPort;
        if (haInstanceConfig.discovery && _.has(haInstanceConfig.discovery, 'port')) {
          discoveryPort = _.get(haInstanceConfig.discovery, 'port');
        }
        if (hasDiscoveryInThisInstance) {
          val.push(`https://${haInstanceHostname}:${discoveryPort}/eureka/`.toLowerCase());
        }
      }
    } else if (defaultEnabled) { // any chance it's not enabled in this case?
      val.push(`https://${defaultExternalDomain}:${defaultPort}/eureka/`.toLowerCase());
    }
    return _.uniq(val).join(',');
  },
  comment_120: '# Enable debug logging for Api Mediation Layer services',
  APIML_DEBUG_MODE_ENABLED:  function(yamlConfigObj, haInstance, componentId) {
    const bVal = _.get(yamlConfigObj, 'components.gateway.debug');
    if (_.get(yamlConfigObj, 'components.discovery.debug') !== bVal) {
      process.stderr.write(`WARNING: <workspace-dir>/${componentId}/.configs-${haInstance}.json value of components.discovery.debug is not same as other sibling configs\n`);
    }
    if (_.get(yamlConfigObj, 'components.api-catalog.debug') !== bVal) {
      process.stderr.write(`WARNING: <workspace-dir>/${componentId}/.configs-${haInstance}.json value of components.api-catalog.debug is not same as other sibling configs\n`);
    }
    return bVal;
  },
  APIML_MAX_CONNECTIONS_PER_ROUTE: "components.gateway.maxConnectionsPerRoute",
  APIML_MAX_TOTAL_CONNECTIONS: "components.gateway.totalConnections",
  // ####################
  comment_140: '# caching service',
  // TCP port of caching service
  ZWE_CACHING_SERVICE_PORT: "components.caching-service.port",
  // specify amount of records before eviction strategies start evicting
  ZWE_CACHING_STORAGE_SIZE: "components.caching-service.vsam.storageSize",
  // specify eviction strategy to be used when the storage size is achieved
  ZWE_CACHING_EVICTION_STRATEGY: "components.caching-service.evictionStrategy",
  // specify persistent method of caching service
  // currently VSAM is the only option
  ZWE_CACHING_SERVICE_PERSISTENT: "components.caching-service.persistent",
  // specify the data set name of the caching service VSAM
  ZWE_CACHING_SERVICE_VSAM_DATASET: "components.caching-service.vsam.dataset",

  separator_200: '\n',
  comment_200: '# explorer variables',
  JOBS_API_PORT: "components.jobs-api.port",
  FILES_API_PORT: "components.files-api.port",
  JES_EXPLORER_UI_PORT: "components.explorer-jes.port",
  MVS_EXPLORER_UI_PORT: "components.explorer-mvs.port",
  USS_EXPLORER_UI_PORT: "components.explorer-uss.port",
  ZOWE_EXPLORER_FRAME_ANCESTORS: ["components.explorer-jes.frameAncestors", "components.explorer-mvs.frameAncestors", "components.explorer-uss.frameAncestors"],
  
  separator_300: '\n',
  comment_300: '# Zowe Desktop/app framework variables',
  ZOWE_ZLUX_SERVER_HTTPS_PORT: "components.app-server.port",
  ZOWE_ZSS_SERVER_PORT: "components.zss.port",
  ZOWE_ZSS_XMEM_SERVER_NAME: "components.zss.crossMemoryServerName",
  // ZOWE_ZLUX_SSH_PORT: "components.app-server.plugins.vt-term.port",
  // ZOWE_ZLUX_TELNET_PORT: "components.app-server.plugins.tn3270.port",
  // ZOWE_ZLUX_SECURITY_TYPE: "components.app-server.plugins.tn3270.security",

  separator_400: '\n',
  comment_400: '# Extender variables',
  ZWEAD_EXTERNAL_STATIC_DEF_DIRECTORIES: "components.discovery.alternativeStaticDefinitionsDirectories",
  EXTERNAL_COMPONENTS: function(yamlConfigObj) {
    const val = [];
    if (yamlConfigObj.components) {
      for (const component in yamlConfigObj.components) {
        if (DEFAULT_ZOWE_CORE_COMPONENTS.indexOf(component) === -1 && DEFAULT_ZOWE_CORE_COMPONENT_CANDIDATES.indexOf(component) === -1) {
          if (yamlConfigObj.components[component].enabled) {
            val.push(component);
          }
        }
      }
    }
    return val.join(',');
  },

  separator_430: '\n',
  comment_430: '# other variables',
  ZWE_LOG_LEVEL_ZWELS: "zowe.launchScript.logLevel",
  ZOWE_CACHING_SERVICE_START: function(yamlConfigObj) {
    return getBooleanVal(yamlConfigObj, 'components.caching-service.enabled');
  },
  STATIC_DEF_CONFIG_DIR: "components.discovery.staticDefinitionsDirectories",
  ZOWE_APIM_VERIFY_CERTIFICATES: function(yamlConfigObj) {
    return getBooleanVal(yamlConfigObj, 'components.gateway.verifyCertificates');
  },
  // ZWE_EXTERNAL_HOSTS: function(yamlConfigObj) {
  //   const val = _.get(yamlConfigObj, 'zowe.externalDomains') || [];
  //   return val.join(',');
  // },
  // SSO_FALLBACK_TO_NATIVE_AUTH: false,
  // deprecated/abandoned variables
  APIML_ENABLE_SSO: false,
  // variables should be ignored
  ZWE_ENVIRONMENT_PREPARED: false,

  separator_500: '\n',
  comment_500: '# ========== certificate =============',
  comment_501: '# keystore config',
  // KEYSTORE_DIRECTORY: "/ZOWE/tmp/keystore",
  ZWE_EXTENSION_DIR: "zowe.extensionDirectory",
  comment_510: '# keystore',
  KEYSTORE_TYPE: function(yamlConfigObj) {
    const certObj = getCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'keystore.type');
  },
  KEYSTORE: function(yamlConfigObj) {
    const certObj = getCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'keystore.file');
  },
  KEYSTORE_PASSWORD: function(yamlConfigObj) {
    const certObj = getCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'keystore.password');
  },
  KEY_ALIAS: function(yamlConfigObj) {
    const certObj = getCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'keystore.keyAlias');
  },
  comment_540: '# truststore',
  TRUSTSTORE: function(yamlConfigObj) {
    const certObj = getCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'trustStore.file');
  },
  EXTERNAL_CERTIFICATE_AUTHORITIES: function(yamlConfigObj) {
    const certObj = getCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'trustStore.certificateAuthorities');
  },
  comment_560: '# pem format',
  KEYSTORE_KEY: function(yamlConfigObj) {
    const certObj = getCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'pem.key');
  },
  KEYSTORE_CERTIFICATE: function(yamlConfigObj) {
    const certObj = getCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'pem.certificate');
  },
  KEYSTORE_CERTIFICATE_AUTHORITY: function(yamlConfigObj) {
    const certObj = getCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'pem.certificateAuthority');
  },
  // EXTERNAL_ROOT_CA: ""
  comment_580: '# token',
  PKCS11_TOKEN_LABEL: "zowe.sso.token.label",
  PKCS11_TOKEN_NAME: "zowe.sso.token.name",
};

module.exports = {
  YAML_TO_ENV_MAPPING,
};
