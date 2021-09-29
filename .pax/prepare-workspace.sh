#!/bin/sh -e
#
# SCRIPT ENDS ON FIRST NON-ZERO RC
#
#######################################################################
# This program and the accompanying materials are made available
# under the terms of the Eclipse Public License v2.0 which
# accompanies this distribution, and is available at
# https://www.eclipse.org/legal/epl-v20.html
#
# SPDX-License-Identifier: EPL-2.0
#
# Copyright Contributors to the Zowe Project. 2021
#######################################################################

#######################################################################
# Build script
#
# runs on Jenkins server, before sending data to z/OS
#######################################################################
set -x

# expected input workspace layout ($ROOT_DIR):
# ./.pax/keyring-util/
# ./bin/
# ./files/
# ./install/
# ./manifest.json
# ./scripts/
# ./shared/scripts/
# ./workflows/files/
# ./workflows/templates/

# ---------------------------------------------------------------------
# --- main --- main --- main --- main --- main --- main --- main ---
# ---------------------------------------------------------------------
SCRIPT_NAME=$(basename "$0")  # $0=./.pax/prepare-workspace.sh
BASE_DIR=$(dirname $0)   # <something>/.pax

cd $BASE_DIR
cd ..
ROOT_DIR=$(pwd)
PAX_WORKSPACE_DIR=${ROOT_DIR}/.pax

# workspace path abbreviations, relative to $ROOT_DIR
ASCII_DIR="${PAX_WORKSPACE_DIR}/ascii"
CONTENT_DIR="${PAX_WORKSPACE_DIR}/content"

echo "[${SCRIPT_NAME}] clean up build temporary files ..."
subprojects="config-converter fconv format-converter jackson-jq ncert njq zowe-utility-tools-package"
for sub in ${subprojects}; do
  rm -fr "${sub}/build"
  rm -fr "${sub}/node_modules"
  rm -fr "${sub}/zowe-"*.tgz
done

# prepare pax workspace
echo "[${SCRIPT_NAME}] preparing folders ..."
rm -fr ${ASCII_DIR}
mkdir -p "${ASCII_DIR}"
rm -fr ${CONTENT_DIR}
mkdir -p "${CONTENT_DIR}"

# copy from current github source
echo "[${SCRIPT_NAME}] copying files ..."
cp bootstrap_gradlew.sh          "${CONTENT_DIR}"
cp gradle.properties             "${CONTENT_DIR}"
cp gradlew                       "${CONTENT_DIR}"
cp settings.gradle               "${CONTENT_DIR}"
cp README.md                     "${CONTENT_DIR}"
cp -r config-converter           "${CONTENT_DIR}"
cp -r fconv                      "${CONTENT_DIR}"
cp -r format-converter           "${CONTENT_DIR}"
cp -r gradle                     "${CONTENT_DIR}"
cp -r jackson-jq                 "${CONTENT_DIR}"
cp -r ncert                      "${CONTENT_DIR}"
cp -r njq                        "${CONTENT_DIR}"
cp -r zowe-utility-tools-package "${CONTENT_DIR}"

# put text files into ascii folder (recursive & verbose)
rsync -rv \
  --exclude '*.zip' \
  --exclude '*.png' \
  --exclude '*.tgz' \
  --exclude '*.tar.gz' \
  --exclude '*.pax' \
  --exclude '*.jar' \
  --exclude '*.class' \
  --prune-empty-dirs --remove-source-files \
  "${CONTENT_DIR}/" \
  "${ASCII_DIR}"

echo "[$SCRIPT_NAME] done"

