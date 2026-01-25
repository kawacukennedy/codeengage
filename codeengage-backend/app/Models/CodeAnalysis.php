<?php

namespace App\Models;

class CodeAnalysis
{
    private string $code;
    private string $language;
    private array $analysis;

    public function __construct(string $code, string $language)
    {
        $this->code = $code;
        $this->language = $language;
        $this->analysis = $this->performAnalysis();
    }

    public function getComplexityScore(): float
    {
        return $this->analysis['complexity_score'];
    }

    public function getSecurityIssues(): array
    {
        return $this->analysis['security_issues'];
    }

    public function getPerformanceSuggestions(): array
    {
        return $this->analysis['performance_suggestions'];
    }

    public function getCodeSmells(): array
    {
        return $this->analysis['code_smells'];
    }

    public function getLinesOfCode(): int
    {
        return $this->analysis['metrics']['lines_of_code'];
    }

    public function getCharacterCount(): int
    {
        return $this->analysis['metrics']['character_count'];
    }

    public function getFunctions(): array
    {
        return $this->analysis['metrics']['functions'];
    }

    public function getClasses(): array
    {
        return $this->analysis['metrics']['classes'];
    }

    public function getImports(): array
    {
        return $this->analysis['metrics']['imports'];
    }

    public function getDetectedLanguage(): string
    {
        return $this->analysis['metrics']['language_detected'];
    }

    private function performAnalysis(): array
    {
        return [
            'complexity_score' => $this->calculateComplexity(),
            'security_issues' => $this->detectSecurityIssues(),
            'performance_suggestions' => $this->detectPerformanceIssues(),
            'code_smells' => $this->detectCodeSmells(),
            'metrics' => $this->calculateMetrics()
        ];
    }

    private function calculateComplexity(): float
    {
        $complexity = 1; // Base complexity
        
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
            preg_match_all($pattern, $this->code, $matches);
            $complexity += count($matches[0]) * $weight;
        }
        
        return round($complexity, 2);
    }

    private function detectSecurityIssues(): array
    {
        $issues = [];
        
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
                if (preg_match($pattern, $this->code)) {
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

    private function detectPerformanceIssues(): array
    {
        $suggestions = [];
        
        $performancePatterns = [
            'Nested Loops' => [
                '/for.*{.*for.*{/',
                '/while.*{.*while.*{/',
                '/for.*{.*while.*{/',
            ],
            'Inefficient String Operations' => [
                '/\+\s*\+\s*\+/', // Multiple string concatenation
                '/str_replace.*\/.*\/.*\//', // Multiple str_replace
            ],
            'Large Array Operations' => [
                '/array_map.*array_map/',
                '/array_filter.*array_filter/',
            ],
            'Blocking Operations' => [
                '/sleep\(/',
                '/usleep\(/',
                '/file_get_contents.*\$/',
            ],
        ];
        
        foreach ($performancePatterns as $type => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $this->code)) {
                    $suggestions[] = [
                        'type' => $type,
                        'severity' => 'medium',
                        'description' => "Consider optimizing " . strtolower($type),
                    ];
                }
            }
        }
        
        return $suggestions;
    }

    private function detectCodeSmells(): array
    {
        $smells = [];
        
        $smellPatterns = [
            'Long Method' => [
                'lines' => $this->countLines() > 50
            ],
            'Large Class' => [
                'classes' => count($this->extractClasses()) > 10
            ],
            'Too Many Parameters' => [
                'params' => $this->countParameters() > 7
            ],
            'Deep Nesting' => [
                'nesting' => $this->calculateNestingLevel() > 5
            ],
            'Duplicate Code' => [
                'duplicates' => $this->detectDuplicates()
            ]
        ];
        
        foreach ($smellPatterns as $type => $check) {
            if (is_array($check)) {
                foreach ($check as $condition => $value) {
                    if ($value) {
                        $smells[] = [
                            'type' => $type,
                            'severity' => 'medium',
                            'description' => "Detected {$type}: " . json_encode($condition)
                        ];
                    }
                }
            }
        }
        
        return $smells;
    }

    private function calculateMetrics(): array
    {
        $lines = explode("\n", $this->code);
        $nonEmptyLines = array_filter($lines, fn($line) => trim($line) !== '');
        
        return [
            'lines_of_code' => count($lines),
            'non_empty_lines' => count($nonEmptyLines),
            'character_count' => strlen($this->code),
            'character_count_no_spaces' => strlen(str_replace(' ', '', $this->code)),
            'average_line_length' => count($nonEmptyLines) > 0 ? 
                round(array_sum(array_map('strlen', $nonEmptyLines)) / count($nonEmptyLines)) : 0,
            'functions' => $this->extractFunctions(),
            'classes' => $this->extractClasses(),
            'imports' => $this->extractImports(),
            'language_detected' => $this->detectLanguage()
        ];
    }

    private function extractFunctions(): array
    {
        $functions = [];
        
        $functionPatterns = [
            'javascript' => [
                '/function\s+(\w+)\s*\([^)]*\)/',
                '/const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/',
                '/var\s+(\w+)\s*=\s*\([^)]*\)\s*=>/'
            ],
            'python' => [
                '/def\s+(\w+)\s*\([^)]*\)/'
            ],
            'php' => [
                '/function\s+(\w+)\s*\([^)]*\)/'
            ],
            'java' => [
                '/(?:public|private|protected)?\s*(?:static)?\s*(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*{/'
            ],
            'cpp' => [
                '/(?:inline|virtual)?\s*(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*{/'
            ]
        ];
        
        $patterns = $functionPatterns[$this->language] ?? [];
        
        foreach ($patterns as $pattern) {
            preg_match_all($pattern, $this->code, $matches);
            if (!empty($matches[1])) {
                $functions = array_merge($functions, $matches[1]);
            }
        }
        
        return array_unique($functions);
    }

    private function extractClasses(): array
    {
        $classes = [];
        
        $classPatterns = [
            'javascript' => [
                '/class\s+(\w+)/'
            ],
            'python' => [
                '/class\s+(\w+)/'
            ],
            'php' => [
                '/class\s+(\w+)/'
            ],
            'java' => [
                '/(?:public|private|protected)?\s*class\s+(\w+)/'
            ],
            'cpp' => [
                '/class\s+(\w+)/'
            ],
            'csharp' => [
                '/(?:public|private|protected)?\s*class\s+(\w+)/'
            ]
        ];
        
        $patterns = $classPatterns[$this->language] ?? [];
        
        foreach ($patterns as $pattern) {
            preg_match_all($pattern, $this->code, $matches);
            if (!empty($matches[1])) {
                $classes = array_merge($classes, $matches[1]);
            }
        }
        
        return array_unique($classes);
    }

    private function extractImports(): array
    {
        $imports = [];
        
        $importPatterns = [
            'javascript' => [
                '/import\s+.*from\s+[\'"]([^\'"]+)[\'"]/',
                '/require\s*\([\'"]([^\'"]+)[\'"]\)/'
            ],
            'python' => [
                '/import\s+(.+)/',
                '/from\s+(.+)\s+import/'
            ],
            'php' => [
                '/require\s*\([\'"]([^\'"]+)[\'"]\)/',
                '/include\s*\([\'"]([^\'"]+)[\'"]\)/'
            ],
            'java' => [
                '/import\s+(.+)/'
            ],
            'cpp' => [
                '/#include\s*<(.+)>/',
                '/#include\s*\([\'"]([^\'"]+)[\'"]\)/'
            ]
        ];
        
        $patterns = $importPatterns[$this->language] ?? [];
        
        foreach ($patterns as $pattern) {
            preg_match_all($pattern, $this->code, $matches);
            if (!empty($matches[1])) {
                $imports = array_merge($imports, $matches[1]);
            }
        }
        
        return array_unique($imports);
    }

    private function detectLanguage(): string
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
            'bash' => ['#!/bin/bash', 'echo', 'export', 'function', 'if [']
        ];
        
        $scores = [];
        
        foreach ($languages as $lang => $keywords) {
            $score = 0;
            foreach ($keywords as $keyword) {
                $score += substr_count(strtolower($this->code), strtolower($keyword));
            }
            $scores[$lang] = $score;
        }
        
        return array_key_exists(max($scores), $scores) ? max($scores) : 'text';
    }

    private function countLines(): int
    {
        return count(explode("\n", $this->code));
    }

    private function countParameters(): int
    {
        // Simple parameter counting - in production, use AST parsing
        preg_match_all('/\([^)]*\)/', $this->code, $matches);
        $maxParams = 0;
        
        foreach ($matches[0] as $params) {
            $paramCount = count(explode(',', $params));
            $maxParams = max($maxParams, $paramCount);
        }
        
        return $maxParams;
    }

    private function calculateNestingLevel(): int
    {
        $lines = explode("\n", $this->code);
        $maxNesting = 0;
        $currentNesting = 0;
        
        foreach ($lines as $line) {
            $openBraces = substr_count($line, '{');
            $closeBraces = substr_count($line, '}');
            
            $currentNesting += $openBraces - $closeBraces;
            $maxNesting = max($maxNesting, $currentNesting);
        }
        
        return $maxNesting;
    }

    private function detectDuplicates(): bool
    {
        // Simple duplicate detection - in production, use more sophisticated algorithms
        $lines = array_filter(explode("\n", $this->code), fn($line) => trim($line) !== '');
        $uniqueLines = array_unique($lines);
        
        return count($lines) > count($uniqueLines);
    }
}