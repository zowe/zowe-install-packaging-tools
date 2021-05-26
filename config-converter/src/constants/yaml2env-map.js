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
const merge = require('deepmerge');
const { DEFAULT_ZOWE_CORE_COMPONENTS, DEFAULT_ZOWE_CORE_COMPONENT_CANDIDATES } = require('./index');

const getBooleanVal = (obj, path) => {
  const val = _.get(obj, path);
  return _.isUndefined(val) ? val : `${val}`;
};

const getDiscoveryList = (originalConfigObj) => {
  const val = [];
  const defaultEnabled = _.get(originalConfigObj, 'components.discovery.enabled');
  const defaultPort = _.get(originalConfigObj, 'components.discovery.port');
  const defaultExternalDomain = _.get(originalConfigObj, 'zowe.externalDomains.0') || '';
  if (originalConfigObj.haInstances) {
    for (const haInstanceId in originalConfigObj.haInstances) {
      const haInstanceConfig = originalConfigObj.haInstances[haInstanceId];
      const haInstanceDiscoveryConfig = haInstanceConfig && haInstanceConfig.components && haInstanceConfig.components.discovery;
      const haInstanceHostname = (haInstanceConfig && haInstanceConfig.hostname) || defaultExternalDomain;
      let hasDiscoveryInThisInstance = false;
      if (haInstanceDiscoveryConfig && _.has(haInstanceDiscoveryConfig, 'enabled')) {
        hasDiscoveryInThisInstance = _.get(haInstanceDiscoveryConfig, 'enabled');
      } else {
        hasDiscoveryInThisInstance = defaultEnabled;
      }

      let discoveryPort = defaultPort;
      if (haInstanceDiscoveryConfig && _.has(haInstanceDiscoveryConfig, 'port')) {
        discoveryPort = _.get(haInstanceDiscoveryConfig, 'port');
      }
      if (hasDiscoveryInThisInstance) {
        val.push(`https://${haInstanceHostname}:${discoveryPort}/eureka/`.toLowerCase());
      }
    }
  } else if (defaultEnabled) { // any chance it's not enabled in this case?
    val.push(`https://${defaultExternalDomain}:${defaultPort}/eureka/`.toLowerCase());
  }
  return _.uniq(val).join(',');
};

// returns HA-instance-id where the service is enabled
const isServiceEnabledAnywhere = (originalConfigObj, serviceKey) => {
  let val = '';
  const defaultEnabled = _.get(originalConfigObj, `components.${serviceKey}.enabled`);
  if (originalConfigObj.haInstances) {
    for (const haInstanceId in originalConfigObj.haInstances) {
      const haInstanceConfig = originalConfigObj.haInstances[haInstanceId];
      const haInstanceServiceConfig = haInstanceConfig && haInstanceConfig.components && haInstanceConfig.components[serviceKey];
      let hasServiceInThisInstance = false;
      if (haInstanceServiceConfig && _.has(haInstanceServiceConfig, 'enabled')) {
        hasServiceInThisInstance = _.get(haInstanceServiceConfig, 'enabled');
      } else {
        hasServiceInThisInstance = defaultEnabled;
      }

      if (hasServiceInThisInstance) {
        val = haInstanceId;
      }
    }
  } else if (defaultEnabled) { // any chance it's not enabled in this case?
    val = '_';
  }
  return val;
};

// normal components (except for gateway) use `certificate` to define what certificate it will use
const getCertificateConfig = (configObj) => {
  return merge.all([
    configObj.zowe && configObj.zowe.externalCertificate || {},
    configObj.zowe && configObj.zowe.internalCertificate || {},
    configObj.configs && configObj.configs.certificate || {},
  ]);
};

// gateway uses
// - `certificate` to define certificate used for external connector
// - `internalCertificate` to define certificate used for internal connector
const getGatewayInternalCertificateConfig = (configObj) => {
  return merge.all([
    configObj.zowe && configObj.zowe.externalCertificate || {},
    configObj.zowe && configObj.zowe.internalCertificate || {},
    configObj.configs && configObj.configs.internalCertificate || {},
  ]);
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

  // should be deprecated
  ZOWE_EXPLORER_HOST: function(yamlConfigObj) {
    return _.get(yamlConfigObj, 'haInstance.hostname') || _.get(yamlConfigObj, 'zowe.externalDomains.0') || '';
  },
  // this is the expected variable instead of ZOWE_EXPLORER_HOST
  ZWE_INTERNAL_HOST: function(yamlConfigObj) {
    const customized = _.get(yamlConfigObj, 'zowe.environments.ZWE_INTERNAL_HOST');
    if (customized) {
      return customized;
    }
    return _.get(yamlConfigObj, 'haInstance.hostname') || _.get(yamlConfigObj, 'zowe.externalDomains.0') || '';
  },
  ZOWE_IP_ADDRESS: function(yamlConfigObj) {
    return _.get(yamlConfigObj, 'haInstance.ip') || _.get(yamlConfigObj, 'zowe.environments.ZOWE_IP_ADDRESS') || '';
  },

  separator_100: '\n',
  comment_100: '# APIML variables',
  CATALOG_PORT: "components.api-catalog.port",
  DISCOVERY_PORT: "components.discovery.port",
  GATEWAY_PORT: ["zowe.externalPort", "components.gateway.port"],
  APIML_GATEWAY_INTERNAL_HOST: "zowe.gatewayInternalHost",
  APIML_GATEWAY_INTERNAL_PORT: "zowe.gatewayInternalPort",
  APIML_ALLOW_ENCODED_SLASHES: function(yamlConfigObj) {
    return getBooleanVal(yamlConfigObj, 'components.gateway.apiml.service.allowEncodedSlashes');
  },
  APIML_CORS_ENABLED: function(yamlConfigObj) {
    return getBooleanVal(yamlConfigObj, 'components.gateway.apiml.service.corsEnabled');
  },
  APIML_PREFER_IP_ADDRESS: function(yamlConfigObj, haInstance, componentId) {
    let val = getBooleanVal(yamlConfigObj, `components.${componentId}.environment.preferIpAddress`);
    if (_.isUndefined(val)) {
      // discovery and gateway are defined as apiml.service.preferIpAddress
      val = getBooleanVal(yamlConfigObj, `components.${componentId}.apiml.service.preferIpAddress`);
      if (_.isUndefined(val)) {
        val = false;
      }
    }
    return val;
  },
  APIML_GATEWAY_TIMEOUT_MILLIS: "components.gateway.apiml.gateway.timeoutMillis",
  APIML_SECURITY_X509_ENABLED: function(yamlConfigObj) {
    return getBooleanVal(yamlConfigObj, 'components.gateway.apiml.security.x509.enabled');
  },
  APIML_SECURITY_ZOSMF_APPLID: ["zOSMF.applId", "components.gateway.apiml.security.zosmf.applid"],
  APIML_SECURITY_AUTH_PROVIDER: "components.gateway.apiml.security.auth.provider",
  // added by https://github.com/zowe/zowe-install-packaging/pull/2021
  APIML_GATEWAY_EXTERNAL_MAPPER: "components.gateway.apiml.security.x509.externalMapperUrl",
  APIML_SECURITY_AUTHORIZATION_ENDPOINT_URL: "components.gateway.apiml.security.authorization.endpoint.url",
  // List of discovery service URLs separated by comma
  ZWE_DISCOVERY_SERVICES_LIST: function(yamlConfigObj, haInstance, componentId, originalConfigObj) {
    return getDiscoveryList(originalConfigObj);
  },
  comment_120: '# Enable debug logging for Api Mediation Layer services',
  APIML_DEBUG_MODE_ENABLED:  function(yamlConfigObj, haInstance, componentId) {
    let val = getBooleanVal(yamlConfigObj, `components.${componentId}.debug`);
    if (_.isUndefined(val)) {
      val = false;
    }
    return val;
  },
  APIML_MAX_CONNECTIONS_PER_ROUTE: "components.gateway.server.maxConnectionsPerRoute",
  APIML_MAX_TOTAL_CONNECTIONS: "components.gateway.server.maxTotalConnections",
  // ####################
  comment_140: '# caching service',
  // TCP port of caching service
  ZWE_CACHING_SERVICE_PORT: "components.caching-service.port",
  // specify amount of records before eviction strategies start evicting
  ZWE_CACHING_STORAGE_SIZE: "components.caching-service.storage.size",
  // specify eviction strategy to be used when the storage size is achieved
  ZWE_CACHING_EVICTION_STRATEGY: "components.caching-service.storage.evictionStrategy",
  // specify persistent method of caching service
  // currently VSAM is the only option
  ZWE_CACHING_SERVICE_PERSISTENT: "components.caching-service.storage.mode",
  // specify the data set name of the caching service VSAM
  ZWE_CACHING_SERVICE_VSAM_DATASET: "components.caching-service.storage.vsam.name",

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
  ZOWE_ZSS_SERVER_TLS:  function(yamlConfigObj) {
    return getBooleanVal(yamlConfigObj, 'components.zss.tls');
  },
  // ZOWE_ZLUX_SSH_PORT: "components.app-server.plugins.vt-term.port",
  // ZOWE_ZLUX_TELNET_PORT: "components.app-server.plugins.tn3270.port",
  // ZOWE_ZLUX_SECURITY_TYPE: "components.app-server.plugins.tn3270.security",
  ZWED_node_mediationLayer_enabled: function(yamlConfigObj, haInstance, componentId, originalConfigObj) {
    const customized = _.get(yamlConfigObj, 'zowe.environments.ZWED_node_mediationLayer_enabled');
    if (customized) {
      return customized;
    }
    const gatewayIsAvailableAt = !!isServiceEnabledAnywhere(originalConfigObj, 'gateway');
    const discoveryIsAvailableAt = !!isServiceEnabledAnywhere(originalConfigObj, 'discovery');
    // FIXME: should we check "and" or "or" here?
    return gatewayIsAvailableAt || discoveryIsAvailableAt;
  },
  ZWED_node_mediationLayer_server_gatewayHostname: function(yamlConfigObj, haInstance, componentId, originalConfigObj) {
    const customized = _.get(yamlConfigObj, 'zowe.environments.ZWED_node_mediationLayer_server_gatewayHostname');
    if (customized) {
      return customized;
    }
    const gatewayIsAvailableAt = isServiceEnabledAnywhere(originalConfigObj, 'gateway');
    const val = _.get(yamlConfigObj, 'zowe.externalDomains.0') || '';
    return (gatewayIsAvailableAt && val ? val : undefined);
  },
  ZWED_node_mediationLayer_server_gatewayPort: function(yamlConfigObj, haInstance, componentId, originalConfigObj) {
    const customized = _.get(yamlConfigObj, 'zowe.environments.ZWED_node_mediationLayer_server_gatewayPort');
    if (customized) {
      return customized;
    }
    const gatewayIsAvailableAt = isServiceEnabledAnywhere(originalConfigObj, 'gateway');
    const val = _.get(yamlConfigObj, 'zowe.externalPort');
    return (gatewayIsAvailableAt ? val : undefined);
  },
  comment_320: '# FIXME: currently only the first discovery in the list will be put here',
  ZWED_node_mediationLayer_server_hostname: function(yamlConfigObj, haInstance, componentId, originalConfigObj) {
    const customized = _.get(yamlConfigObj, 'zowe.environments.ZWED_node_mediationLayer_server_hostname');
    if (customized) {
      return customized;
    }
    const discoveryList = getDiscoveryList(originalConfigObj).split(/,/);
    // FIXME: desktop should use ZWE_DISCOVERY_SERVICES_LIST to register, instead of relying on the first discovery instance
    const firstDiscovery = discoveryList[0];
    let val = undefined;
    if (firstDiscovery) {
      const m = firstDiscovery.match(/https?:\/\/(.+):[0-9]+\/eureka\//);
      if (m) {
        val = m[1];
      }
    }
    return val;
  },
  ZWED_node_mediationLayer_server_port: function(yamlConfigObj, haInstance, componentId, originalConfigObj) {
    const customized = _.get(yamlConfigObj, 'zowe.environments.ZWED_node_mediationLayer_server_port');
    if (customized) {
      return customized;
    }
    const discoveryList = getDiscoveryList(originalConfigObj).split(/,/);
    // FIXME: desktop should use ZWE_DISCOVERY_SERVICES_LIST to register, instead of relying on the first discovery instance
    const firstDiscovery = discoveryList[0];
    let val = undefined;
    if (firstDiscovery) {
      const m = firstDiscovery.match(/https?:\/\/.+:([0-9]+)\/eureka\//);
      if (m) {
        val = m[1];
      }
    }
    return val;
  },
  ZWED_node_mediationLayer_cachingService_enabled: function(yamlConfigObj, haInstance, componentId, originalConfigObj) {
    const customized = _.get(yamlConfigObj, 'zowe.environments.ZWED_node_mediationLayer_cachingService_enabled');
    if (customized) {
      return customized;
    }
    const availableAt = isServiceEnabledAnywhere(originalConfigObj, 'caching-service');
    return !!availableAt;
  },

  separator_400: '\n',
  comment_400: '# Extender variables',
  ZWEAD_EXTERNAL_STATIC_DEF_DIRECTORIES: "components.discovery.alternativeStaticApiDefinitionsDirectories",
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
  STATIC_DEF_CONFIG_DIR: "components.discovery.staticApiDefinitionsDirectories",
  ZOWE_APIM_VERIFY_CERTIFICATES: function(yamlConfigObj, haInstance, componentId) {
    let val = getBooleanVal(yamlConfigObj, `components.${componentId}.apiml.security.ssl.verifySslCertificatesOfServices`);
    if (_.isUndefined(val)) {
      val = true;
    }
    return val;
  },
  ZOWE_APIM_NONSTRICT_VERIFY_CERTIFICATES: function(yamlConfigObj, haInstance, componentId) {
    let val = getBooleanVal(yamlConfigObj, `components.${componentId}.apiml.security.ssl.nonStrictVerifySslCertificatesOfServices`);
    if (_.isUndefined(val)) {
      val = true;
    }
    return val;
  },
  ZWE_EXTERNAL_HOSTS: function(yamlConfigObj) {
    const val = _.get(yamlConfigObj, 'zowe.externalDomains') || [];
    return val.join(',');
  },
  ZWE_REFERRER_HOSTS: function(yamlConfigObj) {
    const val = _.get(yamlConfigObj, 'zowe.referrerHosts') || _.get(yamlConfigObj, 'zowe.externalDomains') || [];
    return val.join(',');
  },
  ZOWE_LOOPBACK_ADDRESS: "zowe.loopbackIp",
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

    return _.get(certObj, 'keystore.alias');
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
  comment_600: '# gateway internal certificate',
  SERVER_INTERNAL_SSL_KEYALIAS: function(yamlConfigObj, haInstance, componentId) {
    if (componentId !== 'gateway') {
      return undefined;
    }
    const certObj = getGatewayInternalCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'keystore.alias');
  },
  SERVER_INTERNAL_SSL_KEYPASSWORD: function(yamlConfigObj, haInstance, componentId) {
    if (componentId !== 'gateway') {
      return undefined;
    }
    const certObj = getGatewayInternalCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'keystore.password');
  },
  SERVER_INTERNAL_SSL_KEYSTOREPASSWORD: function(yamlConfigObj, haInstance, componentId) {
    if (componentId !== 'gateway') {
      return undefined;
    }
    const certObj = getGatewayInternalCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'keystore.password');
  },
  SERVER_INTERNAL_SSL_KEYSTORETYPE: function(yamlConfigObj, haInstance, componentId) {
    if (componentId !== 'gateway') {
      return undefined;
    }
    const certObj = getGatewayInternalCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'keystore.type');
  },
  SERVER_INTERNAL_SSL_KEYSTORE: function(yamlConfigObj, haInstance, componentId) {
    if (componentId !== 'gateway') {
      return undefined;
    }
    const certObj = getGatewayInternalCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'keystore.file');
  },
  SERVER_INTERNAL_SSL_TRUSTSTORETYPE: function(yamlConfigObj, haInstance, componentId) {
    if (componentId !== 'gateway') {
      return undefined;
    }
    const certObj = getGatewayInternalCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'trustStore.type') || _.get(certObj, 'keystore.type');
  },
  SERVER_INTERNAL_SSL_TRUSTSTORE: function(yamlConfigObj, haInstance, componentId) {
    if (componentId !== 'gateway') {
      return undefined;
    }
    const certObj = getGatewayInternalCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'trustStore.file');
  },
  SERVER_INTERNAL_SSL_TRUSTSTOREPASSWORD: function(yamlConfigObj, haInstance, componentId) {
    if (componentId !== 'gateway') {
      return undefined;
    }
    const certObj = getGatewayInternalCertificateConfig(yamlConfigObj);
    if (!certObj) {
      return undefined;
    }

    return _.get(certObj, 'trustStore.password') || _.get(certObj, 'keyStore.password');
  },
};

module.exports = {
  YAML_TO_ENV_MAPPING,
};
