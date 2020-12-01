/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

package org.zowe.utility_tools.format_converter;

import com.google.gson.Gson;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.contrib.java.lang.system.ExpectedSystemExit;
import org.junit.rules.ExpectedException;
import org.junit.rules.TemporaryFolder;
import org.yaml.snakeyaml.Yaml;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.io.Reader;

import picocli.CommandLine;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

public class FormatConverterTest {
    final PrintStream originalOut = System.out;
    final PrintStream originalErr = System.err;
    final ByteArrayOutputStream out = new ByteArrayOutputStream();
    final ByteArrayOutputStream err = new ByteArrayOutputStream();
    
    @Before
    public void setUpStreams() {
        out.reset();
        err.reset();
        System.setOut(new PrintStream(out));
        System.setErr(new PrintStream(err));
    }
    
    @After
    public void restoreStreams() {
        System.setOut(originalOut);
        System.setErr(originalErr);
    }
    
    @Rule
    public TemporaryFolder tempFolder = new TemporaryFolder();

    @Rule
    public ExpectedException thrown = ExpectedException.none();

    @Rule
    public final ExpectedSystemExit exit = ExpectedSystemExit.none();

    private File locateResource(String path) {
        return new File("src/test/resources/" + path);
    }

    private Object loadYaml(String content) {
        Yaml yaml = new Yaml();
        return yaml.load(content);
    }

    private Object loadYaml(Reader reader) {
        Yaml yaml = new Yaml();
        return yaml.load(reader);
    }

    private Object loadYamlFromFile(File file) throws IOException {
        try (
            FileInputStream fi = new FileInputStream(file);
            InputStreamReader reader = new InputStreamReader(fi);
        ) {
            return loadYaml(reader);
        }
    }

    private Object loadYamlFromFile(File file, String encoding) throws IOException {
        try (
            FileInputStream fi = new FileInputStream(file);
            InputStreamReader reader = new InputStreamReader(fi, encoding);
        ) {
            return loadYaml(reader);
        }
    }

    private Object loadJson(String content) {
        Gson gson = new Gson();
        return gson.fromJson(content, Object.class);
    }

    private Object loadJson(Reader reader) {
        Gson gson = new Gson();
        return gson.fromJson(reader, Object.class);
    }

    private Object loadJsonFromFile(File file) throws IOException {
        try (
            FileInputStream fi = new FileInputStream(file);
            InputStreamReader reader = new InputStreamReader(fi);
        ) {
            return loadJson(reader);
        }
    }

    private Object loadJsonFromFile(File file, String encoding) throws IOException {
        try (
            FileInputStream fi = new FileInputStream(file);
            InputStreamReader reader = new InputStreamReader(fi, encoding);
        ) {
            return loadJson(reader);
        }
    }

    @Test
    public void testNoArgs() {
        String[] args = new String[] {};
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        assertEquals(2, exitCode);
        assertEquals("", out.toString());
        assertNotEquals("", err.toString());
        assertTrue(err.toString().contains("Missing required parameter: '<inputFile>'"));
    }

    @Test
    public void testUnknownOptions() {
        String[] args = {
            locateResource("test1.yaml").toString(),
            "--unknown-option=value"
        };
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        assertEquals(2, exitCode);
        assertEquals("", out.toString());
        assertNotEquals("", err.toString());
        assertTrue(err.toString().contains("Unknown option: '--unknown-option=value'"));
    }

    @Test
    public void testUnknownOptionsWithMainMethod() {
        exit.expectSystemExitWithStatus(2);

        FormatConverterCli.main("--unknown-option=value", locateResource("test1.yaml").toString());
        assertEquals("", out.toString());
        assertNotEquals("", err.toString());
        assertTrue(err.toString().contains("Unknown option: '--unknown-option=value'"));
    }

    @Test
    public void testNonExistFile() {
        String[] args = {
            locateResource("file-doesnot-exist.yaml").toString()
        };
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        assertEquals(1, exitCode);
        assertEquals("", out.toString());
        assertNotEquals("", err.toString());
        assertTrue(err.toString().contains("Error reading YAML file"));
    }

    @Test
    public void testUnsupportedFileExtension() {
        String[] args = {
            locateResource("test2.yaml.unknown").toString()
        };
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        assertEquals(1, exitCode);
        assertEquals("", out.toString());
        assertNotEquals("", err.toString());
        assertTrue(err.toString().contains("Unsupported file format: unknown"));
    }

    @Test
    public void testUnsupportedFileExtensionWithSpecifiedFormat() throws IOException {
        String[] args = {
            "--input-format=YAML",
            locateResource("test2.yaml.unknown").toString()
        };
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        assertEquals(0, exitCode);
        assertEquals(loadJsonFromFile(locateResource("test2.json")), loadJson(out.toString()));
        assertEquals("", err.toString());
    }

    @Test
    public void testUnsupportedInputEncoding() throws IOException {
        String[] args = {
            "--input-encoding=non-exist-encoding",
            locateResource("test1.yaml").toString()
        };
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        assertEquals(1, exitCode);
        assertEquals("", out.toString());
        assertNotEquals("", err.toString());
        assertTrue(err.toString().contains("Unsupported input encoding: non-exist-encoding"));
    }

    @Test
    public void testConvertYamlWithMainMethod() throws IOException {
        exit.expectSystemExitWithStatus(0);

        FormatConverterCli.main(locateResource("test1.yaml").toString());
        assertEquals(loadJsonFromFile(locateResource("test1.json")), loadJson(out.toString()));
        assertEquals("", err.toString());
    }

    @Test
    public void testConvertYaml() throws IOException {
        String[] args = {
            locateResource("test1.yaml").toString()
        };
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        assertEquals(0, exitCode);
        assertEquals(loadJsonFromFile(locateResource("test1.json")), loadJson(out.toString()));
        assertEquals("", err.toString());
    }

    @Test
    public void testConvertJson() throws IOException {
        String[] args = {
            locateResource("test1.json").toString()
        };
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        assertEquals(0, exitCode);
        assertEquals(loadYamlFromFile(locateResource("test1.yaml")), loadYaml(out.toString()));
        assertEquals("", err.toString());
    }

    @Test
    public void testConvertYamlAndWriteToFile() throws IOException {
        final File tempFile = tempFolder.newFile("test1.json");

        String[] args = {
            "-o",
            tempFile.toString(),
            locateResource("test1.yaml").toString()
        };
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        assertEquals(0, exitCode);
        assertEquals("", out.toString());
        assertEquals("", err.toString());
        assertEquals(loadJsonFromFile(tempFile), loadJsonFromFile(locateResource("test1.json")));
    }

    @Test
    public void testUnsupportedOutputEncoding() throws IOException {
        final File tempFile = tempFolder.newFile("output-non-exist-encoding.json");

        String[] args = {
            "--output-encoding=non-exist-encoding",
            "-o",
            tempFile.toString(),
            locateResource("test1.yaml").toString()
        };
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        assertEquals(1, exitCode);
        assertEquals("", out.toString());
        assertNotEquals("", err.toString());
        assertTrue(err.toString().contains("Unsupported output encoding: non-exist-encoding"));
    }

    @Test
    public void testConvertYamlAndWriteToNonReachableFile() throws IOException {
        final File target = new File("/non-exist-folder/non-exist-path/test1.json");

        String[] args = {
            "-o",
            target.toString(),
            locateResource("test1.yaml").toString()
        };
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        assertEquals(1, exitCode);
        assertEquals("", out.toString());
        assertNotEquals("", err.toString());
        assertTrue(err.toString().contains("Error opening output file"));
    }
}
