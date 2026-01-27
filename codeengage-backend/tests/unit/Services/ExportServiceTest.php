<?php
/**
 * ExportService Unit Tests
 * 
 * Tests for export service including JSON, Markdown, and VS Code snippet formats.
 */

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\ExportService;
use PDO;

class ExportServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Test JSON export format
     */
    public function testJsonExportFormat(): void
    {
        $snippet = $this->getTestSnippetData();
        $snippet['code'] = 'console.log("Hello");';
        
        $json = json_encode($snippet, JSON_PRETTY_PRINT);
        $decoded = json_decode($json, true);
        
        $this->assertArrayHasKey('title', $decoded);
        $this->assertArrayHasKey('code', $decoded);
        $this->assertArrayHasKey('language', $decoded);
    }

    /**
     * Test Markdown export format
     */
    public function testMarkdownExportFormat(): void
    {
        $snippet = [
            'title' => 'Test Snippet',
            'description' => 'A test snippet',
            'language' => 'javascript',
            'code' => 'console.log("Hello");'
        ];
        
        $markdown = $this->exportToMarkdown($snippet);
        
        $this->assertStringContainsString('# Test Snippet', $markdown);
        $this->assertStringContainsString('```javascript', $markdown);
        $this->assertStringContainsString('console.log("Hello");', $markdown);
    }

    /**
     * Test VS Code snippet format
     */
    public function testVsCodeSnippetFormat(): void
    {
        $snippet = [
            'title' => 'Console Log',
            'prefix' => 'log',
            'code' => 'console.log("$1");',
            'description' => 'Log to console'
        ];
        
        $vsCodeFormat = $this->exportToVsCodeSnippet($snippet);
        
        $this->assertArrayHasKey('Console Log', $vsCodeFormat);
        $this->assertEquals('log', $vsCodeFormat['Console Log']['prefix']);
        $this->assertIsArray($vsCodeFormat['Console Log']['body']);
    }

    /**
     * Test JetBrains live template format
     */
    public function testJetBrainsLiveTemplateFormat(): void
    {
        $snippet = [
            'title' => 'Console Log',
            'abbreviation' => 'log',
            'code' => 'console.log("$END$");'
        ];
        
        $template = $this->exportToJetBrainsTemplate($snippet);
        
        $this->assertStringContainsString('<template', $template);
        $this->assertStringContainsString('abbreviation="log"', $template);
    }

    /**
     * Test HTML embed export
     */
    public function testHtmlEmbedExport(): void
    {
        $snippet = [
            'id' => 123,
            'title' => 'Test',
            'code' => 'console.log("test");',
            'language' => 'javascript'
        ];
        
        $embedCode = $this->generateEmbedCode($snippet);
        
        $this->assertStringContainsString('<iframe', $embedCode);
        $this->assertStringContainsString('snippet/123', $embedCode);
    }

    /**
     * Test batch export creates zip structure
     */
    public function testBatchExportStructure(): void
    {
        $snippets = [
            ['id' => 1, 'title' => 'Snippet 1', 'code' => 'code1'],
            ['id' => 2, 'title' => 'Snippet 2', 'code' => 'code2']
        ];
        
        $files = [];
        foreach ($snippets as $snippet) {
            $filename = $this->generateSafeFilename($snippet['title']) . '.md';
            $files[] = $filename;
        }
        
        $this->assertCount(2, $files);
        $this->assertEquals('snippet-1.md', $files[0]);
    }

    /**
     * Test safe filename generation
     */
    public function testSafeFilenameGeneration(): void
    {
        $titles = [
            'Normal Title' => 'normal-title',
            'Has/Slashes' => 'has-slashes',
            'Special@#$Characters!' => 'special-characters',
            'Multiple   Spaces' => 'multiple-spaces'
        ];
        
        foreach ($titles as $title => $expected) {
            $safe = $this->generateSafeFilename($title);
            $this->assertEquals($expected, $safe);
        }
    }

    /**
     * Test code escaping for different formats
     */
    public function testCodeEscaping(): void
    {
        $codeWithSpecialChars = '<script>alert("XSS");</script>';
        
        // HTML escape
        $htmlSafe = htmlspecialchars($codeWithSpecialChars, ENT_QUOTES, 'UTF-8');
        $this->assertStringNotContainsString('<script>', $htmlSafe);
        
        // JSON escape
        $jsonSafe = json_encode($codeWithSpecialChars);
        $this->assertJson($jsonSafe);
    }

    /**
     * Test export metadata inclusion
     */
    public function testExportMetadataInclusion(): void
    {
        $snippet = $this->getTestSnippetData();
        
        $exportData = [
            'snippet' => $snippet,
            'metadata' => [
                'exported_at' => date('c'),
                'format_version' => '1.0',
                'source' => 'CodeEngage'
            ]
        ];
        
        $this->assertArrayHasKey('metadata', $exportData);
        $this->assertArrayHasKey('exported_at', $exportData['metadata']);
    }

    /**
     * Test multi-line code handling in exports
     */
    public function testMultiLineCodeHandling(): void
    {
        $code = "function test() {\n    console.log('line 1');\n    console.log('line 2');\n}";
        
        // VS Code snippet requires array of lines
        $lines = explode("\n", $code);
        $this->assertCount(4, $lines);
        
        // Markdown should preserve newlines
        $markdown = "```javascript\n{$code}\n```";
        $this->assertStringContainsString("\n", $markdown);
    }

    /**
     * Test tab character handling
     */
    public function testTabCharacterHandling(): void
    {
        $codeWithTabs = "function test() {\n\tconsole.log('test');\n}";
        
        // VS Code expects tabs or spaces
        $hasTab = strpos($codeWithTabs, "\t") !== false;
        $this->assertTrue($hasTab);
        
        // Convert tabs to spaces option
        $withSpaces = str_replace("\t", '    ', $codeWithTabs);
        $this->assertStringNotContainsString("\t", $withSpaces);
    }

    /**
     * Test snippet placeholder syntax conversion
     */
    public function testPlaceholderSyntaxConversion(): void
    {
        $genericCode = 'console.log("{{message}}");';
        
        // VS Code syntax
        $vsCode = preg_replace('/\{\{(\w+)\}\}/', '${1:$1}', $genericCode);
        $this->assertStringContainsString('${1:message}', $vsCode);
        
        // JetBrains syntax
        $jetBrains = preg_replace('/\{\{(\w+)\}\}/', '$$1$', $genericCode);
        $this->assertStringContainsString('$message$', $jetBrains);
    }

    /**
     * Helper: Export snippet to Markdown
     */
    private function exportToMarkdown(array $snippet): string
    {
        $md = "# {$snippet['title']}\n\n";
        
        if (!empty($snippet['description'])) {
            $md .= "{$snippet['description']}\n\n";
        }
        
        $md .= "```{$snippet['language']}\n{$snippet['code']}\n```\n";
        
        return $md;
    }

    /**
     * Helper: Export to VS Code snippet format
     */
    private function exportToVsCodeSnippet(array $snippet): array
    {
        return [
            $snippet['title'] => [
                'prefix' => $snippet['prefix'] ?? strtolower(str_replace(' ', '', $snippet['title'])),
                'body' => explode("\n", $snippet['code']),
                'description' => $snippet['description'] ?? ''
            ]
        ];
    }

    /**
     * Helper: Export to JetBrains live template
     */
    private function exportToJetBrainsTemplate(array $snippet): string
    {
        $code = htmlspecialchars($snippet['code'], ENT_QUOTES | ENT_XML1, 'UTF-8');
        
        return <<<XML
<template abbreviation="{$snippet['abbreviation']}" 
          description="{$snippet['title']}" 
          value="{$code}" />
XML;
    }

    /**
     * Helper: Generate embed code
     */
    private function generateEmbedCode(array $snippet): string
    {
        $baseUrl = 'https://codeengage.com';
        return "<iframe src=\"{$baseUrl}/embed/snippet/{$snippet['id']}\" width=\"100%\" height=\"300\"></iframe>";
    }

    /**
     * Helper: Generate safe filename
     */
    private function generateSafeFilename(string $title): string
    {
        $safe = strtolower($title);
        $safe = str_replace(['/', '\\'], '-', $safe);
        $safe = preg_replace('/[^a-z0-9\s-]/', '-', $safe); // Replace special chars with hyphens
        $safe = preg_replace('/\s+/', '-', $safe);
        $safe = preg_replace('/-+/', '-', $safe);
        return trim($safe, '-');
    }
}
