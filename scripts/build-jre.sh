#!/bin/bash

# Build a minimal JRE using jlink
# This requires a JDK (not just JRE) to be installed.

OUTPUT_DIR="./jre"

if [ -d "$OUTPUT_DIR" ]; then
    echo "Removing existing JRE..."
    rm -rf "$OUTPUT_DIR"
fi

echo "Generating minimal JRE..."

# Common modules for Spring Boot apps
MODULES="java.base,java.logging,java.naming,java.desktop,java.management,java.security.jgss,java.instrument,java.sql,jdk.unsupported"

jlink \
    --add-modules $MODULES \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=2 \
    --output "$OUTPUT_DIR"

echo "JRE generated at $OUTPUT_DIR"
du -sh "$OUTPUT_DIR"
