<?php

namespace App\Helpers;

class CodeHelper
{
    public static function calculateComplexity(string $code): float
    {
        $complexity = 1; // Base complexity
        
        // Count control structures
        $patterns = [
            '/\bif\b/' => 1,
            '/\belse\s+if\b/' => 1,
            '/\belse\b/' => 0,
            '/\bwhile\b/' => 1,
            '/\bfor\b/' => 1,
            '/\bforeach\b/' => 1,
            '/\bswitch\b/' => 1,
            '/\bcase\b/' => 1,
            '/\bcatch\b/' => 1,
            '/\b\?\s*:/' => 1, // ternary operator
            '/\|\|/' => 0.5,
            '/&&/' => 0.5,
        ];
        
        foreach ($patterns as $pattern => $weight) {
            $matches = [];
            preg_match_all($pattern, $code, $matches);
            $complexity += count($matches[0]) * $weight;
        }
        
        return round($complexity, 2);
    }

    public static function detectLanguage(string $code): string
    {
        $languages = [
            'php' => ['<?php', 'function', 'class', 'echo', 'var_dump'],
            'javascript' => ['function', 'const', 'let', 'var', 'console.log', '=>'],
            'python' => ['def', 'import', 'print', 'class', 'if __name__'],
            'java' => ['public class', 'private', 'public static void main', 'System.out'],
            'cpp' => ['#include', 'int main', 'cout', 'cin', 'std::'],
            'csharp' => ['using System', 'public class', 'Console.WriteLine', 'namespace'],
            'go' => ['package main', 'func main', 'fmt.Println', 'import'],
            'rust' => ['fn main', 'use std', 'println!', 'extern crate'],
            'ruby' => ['def ', 'require', 'puts', 'class', 'module'],
            'html' => ['<!DOCTYPE', '<html', '<div', '<script'],
            'css' => ['{', '}', 'margin:', 'padding:', '.class', '#id'],
            'sql' => ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE'],
            'json' => ['{', '}', '"', ':', '[', ']'],
            'xml' => ['<?xml', '<', '</', '>'],
            'yaml' => ['---', ':', '- ', 'key: value'],
            'bash' => ['#!/bin/bash', 'echo', 'export', 'function', 'if ['],
        ];
        
        $scores = [];
        
        foreach ($languages as $lang => $keywords) {
            $score = 0;
            foreach ($keywords as $keyword) {
                $score += substr_count(strtolower($code), strtolower($keyword));
            }
            $scores[$lang] = $score;
        }
        
        arsort($scores);
        return key($scores) ?: 'text';
    }

    public static function extractFunctions(string $code, string $language): array
    {
        $functions = [];
        
        switch ($language) {
            case 'php':
                preg_match_all('/function\s+(\w+)\s*\([^)]*\)/', $code, $matches);
                $functions = $matches[1] ?? [];
                break;
            case 'javascript':
                preg_match_all('/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>)/', $code, $matches);
                $functions = array_filter(array_merge($matches[1] ?? [], $matches[2] ?? []));
                break;
            case 'python':
                preg_match_all('/def\s+(\w+)\s*\([^)]*\)/', $code, $matches);
                $functions = $matches[1] ?? [];
                break;
            case 'java':
            case 'csharp':
                preg_match_all('/(?:public|private|protected)?\s*(?:static)?\s*(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*{/', $code, $matches);
                $functions = $matches[1] ?? [];
                break;
        }
        
        return array_unique($functions);
    }

    public static function detectSecurityIssues(string $code, string $language): array
    {
        $issues = [];
        
        // Common security patterns
        $securityPatterns = [
            'SQL Injection' => [
                '/\$_GET\[.*\].*mysql_query/',
                '/\$_POST\[.*\].*mysql_query/',
                '/\$_REQUEST\[.*\].*mysql_query/',
                '/mysqli_query.*\$_/',
                '/PDO.*prepare.*\$_/',
            ],
            'XSS' => [
                '/echo\s*\$_GET/',
                '/echo\s*\$_POST/',
                '/echo\s*\$_REQUEST/',
                '/innerHTML\s*=.*\$_/',
                '/document\.write.*\$_/',
            ],
            'Path Traversal' => [
                '/include.*\$_GET/',
                '/require.*\$_GET/',
                '/fopen.*\$_GET/',
                '/file_get_contents.*\$_GET/',
            ],
            'Hardcoded Credentials' => [
                '/password\s*=\s*["\'][^"\']+["\']/',
                '/secret\s*=\s*["\'][^"\']+["\']/',
                '/api_key\s*=\s*["\'][^"\']+["\']/',
                '/token\s*=\s*["\'][^"\']+["\']/',
            ],
            'Eval Usage' => [
                '/eval\s*\(/',
                '/assert\s*\(/',
                '/create_function\s*\(/',
                '/preg_replace.*\/e/',
            ],
        ];
        
        foreach ($securityPatterns as $type => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $code)) {
                    $issues[] = [
                        'type' => $type,
                        'severity' => 'high',
                        'description' => "Potential {$type} vulnerability detected",
                    ];
                }
            }
        }
        
        return $issues;
    }

    public static function formatCode(string $code, string $language): string
    {
        // Basic formatting - in production, you'd use language-specific formatters
        return trim($code);
    }

    public static function generateChecksum(string $code): string
    {
        return hash('sha256', $code);
    }
}