@echo off
setlocal enabledelayedexpansion

rem Must match the Gradle version pinned in gradle/wrapper/gradle-wrapper.properties.
set GRADLE_WRAPPER_TAG=v4.9.0
set GRADLE_WRAPPER_SHA256=39112b1024c2294e35e39c0bd9819760aae547c93a315343c947c58b397b5530
set GRADLE_WRAPPER_JAR=gradle\wrapper\gradle-wrapper.jar

if exist %GRADLE_WRAPPER_JAR% (
    echo Gradle Wrapper found; bootstrap complete.
    exit /b 0
)

echo Gradle Wrapper not found. Attempting to download...
powershell -Command "& {(New-Object System.Net.WebClient).DownloadFile('https://raw.githubusercontent.com/gradle/gradle/%GRADLE_WRAPPER_TAG%/gradle/wrapper/gradle-wrapper.jar', '%GRADLE_WRAPPER_JAR%')}"
if errorlevel 1 (
    echo Gradle wrapper download failed. Bootstrap failed.
    goto :fail
)

for /f %%H in ('powershell -Command "(Get-FileHash -Algorithm SHA256 -Path '%GRADLE_WRAPPER_JAR%').Hash.ToLower()"') do set ACTUAL_SHA256=%%H
if /I not "!ACTUAL_SHA256!"=="%GRADLE_WRAPPER_SHA256%" (
    echo Gradle wrapper checksum mismatch. Expected %GRADLE_WRAPPER_SHA256% but got !ACTUAL_SHA256!. Bootstrap failed.
    goto :fail
)

echo Gradle wrapper download success; bootstrap complete.
exit /b 0

:fail
del /f /q %GRADLE_WRAPPER_JAR% >nul 2>&1
exit /b 1
