#!/usr/bin/env sh

# Must match the Gradle version pinned in gradle/wrapper/gradle-wrapper.properties.
GRADLE_WRAPPER_TAG="v4.9.0"
GRADLE_WRAPPER_SHA256="39112b1024c2294e35e39c0bd9819760aae547c93a315343c947c58b397b5530"
GRADLE_WRAPPER_JAR="gradle/wrapper/gradle-wrapper.jar"

if [ ! -f "$GRADLE_WRAPPER_JAR" ]; then
    echo "Gradle Wrapper not found. Attempting to download..."
    curl --silent --fail --output "$GRADLE_WRAPPER_JAR" \
            "https://raw.githubusercontent.com/gradle/gradle/${GRADLE_WRAPPER_TAG}/gradle/wrapper/gradle-wrapper.jar"
    rc=$?;
    if [ $rc != 0 ]; then
        echo "Gradle wrapper download failed. Bootstrap failed."
        rm -f "$GRADLE_WRAPPER_JAR"
        exit 1
    fi

    actualSha256=$(sha256sum "$GRADLE_WRAPPER_JAR" | cut -d ' ' -f 1)
    if [ "$actualSha256" != "$GRADLE_WRAPPER_SHA256" ]; then
        echo "Gradle wrapper checksum mismatch. Expected $GRADLE_WRAPPER_SHA256 but got $actualSha256. Bootstrap failed."
        rm -f "$GRADLE_WRAPPER_JAR"
        exit 1
    fi

    echo "Gradle wrapper download success; bootstrap complete."
    exit 0
else
    echo "Gradle Wrapper found, bootstrap complete."
    exit 0
fi
