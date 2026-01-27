<?php

namespace App\Services;

use PDO;
use App\Repositories\SnippetVersionRepository;
use App\Repositories\AnalysisRepository;
use App\Helpers\SecurityHelper;

class AnalysisService
{
    private PDO $db;
    private SnippetVersionRepository $versionRepository;
    private AnalysisRepository $analysisRepository;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->versionRepository = new SnippetVersionRepository($db);
        $this->analysisRepository = new AnalysisRepository($db);
    }

    public function analyzeCode(int $snippetVersionId, array $options = []): array
    {
        $version = $this->versionRepository->findById($snippetVersionId);
        if (!$version) {
            throw new \Exception('Snippet version not found');
        }

        $code = $version->getCode();
        $language = $version->getLanguage();

        $results = [
            'complexity_score' => $this->calculateComplexity($code, $language),
            'security_issues' => $this->scanSecurityIssues($code, $language),
            'performance_suggestions' => $this->analyzePerformance($code, $language),
            'code_smells' => $this->detectCodeSmells($code, $language),
            'metrics' => $this->calculateMetrics($code, $language),
            'suggestions' => $this->generateSuggestions($code, $language, $options)
        ];

        // Save analysis results
        $this->analysisRepository->create([
            'snippet_version_id' => $snippetVersionId,
            'analysis_type' => 'comprehensive',
            'complexity_score' => $results['complexity_score'],
            'security_issues' => json_encode($results['security_issues']),
            'performance_suggestions' => json_encode($results['performance_suggestions']),
            'code_smells' => json_encode($results['code_smells'])
        ]);

        return $results;
    }

    public function calculateComplexity(string $code, string $language): float
    {
        $complexity = 1; // Base complexity

        switch ($language) {
            case 'javascript':
            case 'typescript':
                $complexity += $this->countJavaScriptComplexity($code);
                break;
            case 'php':
                $complexity += $this->countPhpComplexity($code);
                break;
            case 'python':
                $complexity += $this->countPythonComplexity($code);
                break;
            case 'java':
                $complexity += $this->countJavaComplexity($code);
                break;
            default:
                $complexity += $this->countGenericComplexity($code);
        }

        return round($complexity, 2);
    }

    private function countJavaScriptComplexity(string $code): int
    {
        $complexity = 0;

        // Count decision points
        $patterns = [
            '/\bif\s*\(/',
            '/\belse\s+if\s*\(/',
            '/\bfor\s*\(/',
            '/\bwhile\s*\(/',
            '/\bdo\s*\{/',
            '/\bswitch\s*\(/',
            '/\bcase\s+/',
            '/\bcatch\s*\(/',
            '/\b\?\s*.*\s*:/',
            '/\|\|/',
            '/&&/'
        ];

        foreach ($patterns as $pattern) {
            $matches = [];
            preg_match_all($pattern, $code, $matches);
            $complexity += count($matches[0]);
        }

        // Count function expressions
        $functionPatterns = [
            '/function\s+\w+\s*\(/',
            '/\w+\s*=\s*function\s*\(/',
            '/\w+\s*=\s*\([^)]*\)\s*=>/',
            '/\(\s*\)\s*=>/',
            '/\bclass\s+\w+/',
            '/\btry\s*\{/'
        ];

        foreach ($functionPatterns as $pattern) {
            $matches = [];
            preg_match_all($pattern, $code, $matches);
            $complexity += count($matches[0]) * 0.5;
        }

        return $complexity;
    }

    private function countPhpComplexity(string $code): int
    {
        $complexity = 0;

        $patterns = [
            '/\bif\s*\(/',
            '/\belseif\s*\(/',
            '/\belse\s+if\s*\(/',
            '/\bfor\s*\(/',
            '/\bforeach\s*\(/',
            '/\bwhile\s*\(/',
            '/\bdo\s*\{/',
            '/\bswitch\s*\(/',
            '/\bcase\s+/',
            '/\bcatch\s*\(/',
            '/\?\s*.*\s*:/',
            '/\|\|/',
            '/&&/'
        ];

        foreach ($patterns as $pattern) {
            $matches = [];
            preg_match_all($pattern, $code, $matches);
            $complexity += count($matches[0]);
        }

        return $complexity;
    }

    private function countPythonComplexity(string $code): int
    {
        $complexity = 0;
        $lines = explode("\n", $code);

        foreach ($lines as $line) {
            $line = trim($line);
            
            if (preg_match('/^(if|elif|while|for|except|with)\s+/', $line)) {
                $complexity += 1;
            }
            
            if (preg_match('/^(else|finally)\s*:/', $line)) {
                $complexity += 0.5;
            }
            
            // Count logical operators
            if (preg_match('/\s(and|or)\s/', $line)) {
                $complexity += 0.5;
            }
            
            // Count list comprehensions with conditions
            if (preg_match('/\s+if\s+.*\s+for\s+/', $line)) {
                $complexity += 0.5;
            }
        }

        return $complexity;
    }

    private function countJavaComplexity(string $code): int
    {
        $complexity = 0;

        $patterns = [
            '/\bif\s*\(/',
            '/\belse\s+if\s*\(/',
            '/\bfor\s*\(/',
            '/\bwhile\s*\(/',
            '/\bdo\s*\{/',
            '/\bswitch\s*\(/',
            '/\bcase\s+/',
            '/\bcatch\s*\(/',
            '/\?\s*.*\s*:/',
            '/\|\|/',
            '/&&/'
        ];

        foreach ($patterns as $pattern) {
            $matches = [];
            preg_match_all($pattern, $code, $matches);
            $complexity += count($matches[0]);
        }

        return $complexity;
    }

    private function countGenericComplexity(string $code): int
    {
        $complexity = 0;

        // Generic patterns for most languages
        $patterns = [
            '/\bif\s*\(/',
            '/\bfor\s*\(/',
            '/\bwhile\s*\(/',
            '/\bdo\s*\{/',
            '/\bswitch\s*\(/',
            '/\bcase\s+/',
            '/\bcatch\s*\(/',
            '/\?\s*.*\s*:/',
            '/\|\|/',
            '/&&/'
        ];

        foreach ($patterns as $pattern) {
            $matches = [];
            preg_match_all($pattern, $code, $matches);
            $complexity += count($matches[0]);
        }

        return $complexity;
    }

    public function scanSecurityIssues(string $code, string $language): array
    {
        $issues = [];

        switch ($language) {
            case 'javascript':
            case 'typescript':
                $issues = array_merge($issues, $this->scanJavaScriptSecurity($code));
                break;
            case 'php':
                $issues = array_merge($issues, $this->scanPhpSecurity($code));
                break;
            case 'python':
                $issues = array_merge($issues, $this->scanPythonSecurity($code));
                break;
            default:
                $issues = array_merge($issues, $this->scanGenericSecurity($code));
        }

        return $issues;
    }

    private function scanJavaScriptSecurity(string $code): array
    {
        $issues = [];

        // Check for eval usage
        if (preg_match('/\beval\s*\(/', $code)) {
            $issues[] = [
                'type' => 'dangerous_function',
                'severity' => 'high',
                'message' => 'Use of eval() detected - potential code injection risk',
                'line' => $this->findLineNumber($code, 'eval')
            ];
        }

        // Check for innerHTML usage
        if (preg_match('/\.innerHTML\s*=/', $code)) {
            $issues[] = [
                'type' => 'xss_risk',
                'severity' => 'medium',
                'message' => 'Direct innerHTML assignment - potential XSS risk',
                'line' => $this->findLineNumber($code, '.innerHTML')
            ];
        }

        // Check for document.write
        if (preg_match('/document\.write\s*\(/', $code)) {
            $issues[] = [
                'type' => 'xss_risk',
                'severity' => 'medium',
                'message' => 'document.write() detected - potential XSS risk',
                'line' => $this->findLineNumber($code, 'document.write')
            ];
        }

        // Check for hardcoded secrets
        if (preg_match('/(api_key|secret|password|token)\s*=\s*[\'"][^\'"]+[\'"]/', $code)) {
            $issues[] = [
                'type' => 'hardcoded_secret',
                'severity' => 'high',
                'message' => 'Hardcoded secret detected',
                'line' => $this->findLineNumber($code, 'api_key|secret|password|token')
            ];
        }

        return $issues;
    }

    private function scanPhpSecurity(string $code): array
    {
        $issues = [];

        // Check for eval usage
        if (preg_match('/\beval\s*\(/', $code)) {
            $issues[] = [
                'type' => 'dangerous_function',
                'severity' => 'high',
                'message' => 'Use of eval() detected - potential code injection risk',
                'line' => $this->findLineNumber($code, 'eval')
            ];
        }

        // Check for SQL injection risks
        if (preg_match('/\$_(GET|POST|REQUEST)\[.*\].*mysql_query/', $code)) {
            $issues[] = [
                'type' => 'sql_injection',
                'severity' => 'high',
                'message' => 'Direct use of user input in SQL query detected',
                'line' => $this->findLineNumber($code, 'mysql_query')
            ];
        }

        // Check for include with user input
        if (preg_match('/(include|require).*\$_(GET|POST|REQUEST)/', $code)) {
            $issues[] = [
                'type' => 'file_inclusion',
                'severity' => 'high',
                'message' => 'File inclusion with user input detected',
                'line' => $this->findLineNumber($code, 'include|require')
            ];
        }

        // Check for exec/system usage
        if (preg_match('/\b(exec|system|shell_exec|passthru)\s*\(/', $code)) {
            $issues[] = [
                'type' => 'command_injection',
                'severity' => 'high',
                'message' => 'Use of system execution functions detected',
                'line' => $this->findLineNumber($code, 'exec|system|shell_exec|passthru')
            ];
        }

        return $issues;
    }

    private function scanPythonSecurity(string $code): array
    {
        $issues = [];

        // Check for eval usage
        if (preg_match('/\beval\s*\(/', $code)) {
            $issues[] = [
                'type' => 'dangerous_function',
                'severity' => 'high',
                'message' => 'Use of eval() detected - potential code injection risk',
                'line' => $this->findLineNumber($code, 'eval')
            ];
        }

        // Check for exec usage
        if (preg_match('/\bexec\s*\(/', $code)) {
            $issues[] = [
                'type' => 'dangerous_function',
                'severity' => 'high',
                'message' => 'Use of exec() detected - potential code injection risk',
                'line' => $this->findLineNumber($code, 'exec')
            ];
        }

        // Check for subprocess with shell=True
        if (preg_match('/subprocess\..*\s*shell\s*=\s*True/', $code)) {
            $issues[] = [
                'type' => 'command_injection',
                'severity' => 'medium',
                'message' => 'subprocess with shell=True detected - potential command injection risk',
                'line' => $this->findLineNumber($code, 'subprocess')
            ];
        }

        // Check for pickle usage
        if (preg_match('/\bpickle\.(load|loads)/', $code)) {
            $issues[] = [
                'type' => 'unsafe_deserialization',
                'severity' => 'high',
                'message' => 'Unsafe pickle deserialization detected',
                'line' => $this->findLineNumber($code, 'pickle')
            ];
        }

        return $issues;
    }

    private function scanGenericSecurity(string $code): array
    {
        $issues = [];

        // Generic checks for hardcoded secrets
        if (preg_match('/(api_key|secret|password|token)\s*=\s*[\'"][^\'"]+[\'"]/', $code)) {
            $issues[] = [
                'type' => 'hardcoded_secret',
                'severity' => 'high',
                'message' => 'Hardcoded secret detected',
                'line' => $this->findLineNumber($code, 'api_key|secret|password|token')
            ];
        }

        return $issues;
    }

    public function analyzePerformance(string $code, string $language): array
    {
        $suggestions = [];

        switch ($language) {
            case 'javascript':
            case 'typescript':
                $suggestions = array_merge($suggestions, $this->analyzeJavaScriptPerformance($code));
                break;
            case 'php':
                $suggestions = array_merge($suggestions, $this->analyzePhpPerformance($code));
                break;
            case 'python':
                $suggestions = array_merge($suggestions, $this->analyzePythonPerformance($code));
                break;
        }

        return $suggestions;
    }

    private function analyzeJavaScriptPerformance(string $code): array
    {
        $suggestions = [];

        // Check for nested loops
        if (preg_match('/for\s*\([^)]*\)\s*{[^}]*for\s*\(/', $code)) {
            $suggestions[] = [
                'type' => 'nested_loops',
                'severity' => 'medium',
                'message' => 'Nested loops detected - consider optimizing algorithm',
                'line' => $this->findLineNumber($code, 'for')
            ];
        }

        // Check for DOM queries in loops
        if (preg_match('/for\s*\([^)]*\).*document\.(getElementById|querySelector)/', $code)) {
            $suggestions[] = [
                'type' => 'dom_in_loop',
                'severity' => 'high',
                'message' => 'DOM queries inside loops - cache DOM elements outside loops',
                'line' => $this->findLineNumber($code, 'document')
            ];
        }

        // Check for synchronous AJAX
        if (preg_match('/XMLHttpRequest.*async\s*=\s*false/', $code)) {
            $suggestions[] = [
                'type' => 'sync_ajax',
                'severity' => 'high',
                'message' => 'Synchronous AJAX detected - use async requests',
                'line' => $this->findLineNumber($code, 'XMLHttpRequest')
            ];
        }

        return $suggestions;
    }

    private function analyzePhpPerformance(string $code): array
    {
        $suggestions = [];

        // Check for queries in loops
        if (preg_match('/(for|foreach|while).*mysql_query/', $code)) {
            $suggestions[] = [
                'type' => 'query_in_loop',
                'severity' => 'high',
                'message' => 'Database queries inside loops - consider batch operations',
                'line' => $this->findLineNumber($code, 'mysql_query')
            ];
        }

        // Check for file operations in loops
        if (preg_match('/(for|foreach|while).*(file_get_contents|file_put_contents|fopen)/', $code)) {
            $suggestions[] = [
                'type' => 'file_in_loop',
                'severity' => 'medium',
                'message' => 'File operations inside loops - consider buffering',
                'line' => $this->findLineNumber($code, 'file_get_contents|file_put_contents|fopen')
            ];
        }

        return $suggestions;
    }

    private function analyzePythonPerformance(string $code): array
    {
        $suggestions = [];

        // Check for nested loops
        $lines = explode("\n", $code);
        $inLoop = false;
        $loopDepth = 0;

        foreach ($lines as $lineNum => $line) {
            $line = trim($line);
            
            if (preg_match('/^(for|while)\s+/', $line)) {
                if ($inLoop) {
                    $suggestions[] = [
                        'type' => 'nested_loops',
                        'severity' => 'medium',
                        'message' => 'Nested loops detected - consider optimizing algorithm',
                        'line' => $lineNum + 1
                    ];
                }
                $inLoop = true;
                $loopDepth++;
            } elseif (empty($line) && $inLoop) {
                $loopDepth--;
                if ($loopDepth <= 0) {
                    $inLoop = false;
                }
            }
        }

        return $suggestions;
    }

    public function detectCodeSmells(string $code, string $language): array
    {
        $smells = [];

        // Long method detection
        $lines = explode("\n", $code);
        if (count($lines) > 50) {
            $smells[] = [
                'type' => 'long_method',
                'severity' => 'medium',
                'message' => 'Method is very long (' . count($lines) . ' lines) - consider breaking it down',
                'line' => 1
            ];
        }

        // High complexity detection
        $complexity = $this->calculateComplexity($code, $language);
        if ($complexity > 10) {
            $smells[] = [
                'type' => 'high_complexity',
                'severity' => 'high',
                'message' => 'High cyclomatic complexity (' . $complexity . ') - consider refactoring',
                'line' => 1
            ];
        }

        // Duplicate code detection
        $duplicates = $this->findDuplicateLines($code);
        if (!empty($duplicates)) {
            $smells[] = [
                'type' => 'duplicate_code',
                'severity' => 'medium',
                'message' => 'Duplicate code detected - consider extracting to a method',
                'line' => $duplicates[0]['line']
            ];
        }

        // Large parameter list
        $paramCount = $this->countParameters($code, $language);
        if ($paramCount > 5) {
            $smells[] = [
                'type' => 'long_parameter_list',
                'severity' => 'low',
                'message' => 'Method has many parameters (' . $paramCount . ') - consider using an object',
                'line' => 1
            ];
        }

        return $smells;
    }

    public function calculateMetrics(string $code, string $language): array
    {
        $lines = explode("\n", $code);
        
        return [
            'lines_of_code' => count($lines),
            'non_empty_lines' => count(array_filter($lines, 'trim')),
            'comment_lines' => $this->countCommentLines($code, $language),
            'function_count' => $this->countFunctions($code, $language),
            'class_count' => $this->countClasses($code, $language),
            'complexity_score' => $this->calculateComplexity($code, $language),
            'maintainability_index' => $this->calculateMaintainabilityIndex($code, $language)
        ];
    }

    private function countCommentLines(string $code, string $language): int
    {
        $lines = explode("\n", $code);
        $commentCount = 0;

        foreach ($lines as $line) {
            $line = trim($line);
            
            switch ($language) {
                case 'javascript':
                case 'typescript':
                case 'java':
                case 'php':
                    if (preg_match('/^(\/\/|\/\*|\*|\s*\*\/)/', $line)) {
                        $commentCount++;
                    }
                    break;
                case 'python':
                    if (preg_match('/^(#|\'\'\'|""")/', $line)) {
                        $commentCount++;
                    }
                    break;
                default:
                    if (preg_match('/^(\/\/|#)/', $line)) {
                        $commentCount++;
                    }
            }
        }

        return $commentCount;
    }

    private function countFunctions(string $code, string $language): int
    {
        $patterns = [
            'javascript' => '/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/',
            'typescript' => '/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/',
            'php' => '/function\s+\w+/',
            'python' => '/def\s+\w+/',
            'java' => '/(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/'
        ];

        $pattern = $patterns[$language] ?? '/function\s+\w+/';
        preg_match_all($pattern, $code, $matches);
        
        return count($matches[0]);
    }

    private function countClasses(string $code, string $language): int
    {
        $patterns = [
            'javascript' => '/class\s+\w+/',
            'typescript' => '/class\s+\w+/',
            'php' => '/class\s+\w+/',
            'python' => '/class\s+\w+/',
            'java' => '/(public\s+)?class\s+\w+/'
        ];

        $pattern = $patterns[$language] ?? '/class\s+\w+/';
        preg_match_all($pattern, $code, $matches);
        
        return count($matches[0]);
    }

    private function calculateMaintainabilityIndex(string $code, string $language): float
    {
        $metrics = $this->calculateMetrics($code, $language);
        
        // Simplified maintainability index calculation
        $loc = $metrics['lines_of_code'];
        $complexity = $metrics['complexity_score'];
        $commentRatio = $loc > 0 ? $metrics['comment_lines'] / $loc : 0;
        
        // Halstead Volume (simplified)
        $volume = log($loc + 1, 2);
        
        // Maintainability Index (simplified)
        $mi = max(0, 171 - 5.2 * log($volume) - 0.23 * $complexity - 16.2 * log($loc + 1));
        
        return round($mi, 2);
    }

    public function generateSuggestions(string $code, string $language, array $options = []): array
    {
        $suggestions = [];

        // Code style suggestions
        $suggestions = array_merge($suggestions, $this->generateStyleSuggestions($code, $language));

        // Best practices suggestions
        $suggestions = array_merge($suggestions, $this->generateBestPracticeSuggestions($code, $language));

        // Refactoring suggestions
        $suggestions = array_merge($suggestions, $this->generateRefactoringSuggestions($code, $language));

        return $suggestions;
    }

    private function generateStyleSuggestions(string $code, string $language): array
    {
        $suggestions = [];

        // Check for consistent indentation
        if ($this->hasInconsistentIndentation($code)) {
            $suggestions[] = [
                'type' => 'style',
                'severity' => 'low',
                'message' => 'Inconsistent indentation detected - use consistent spacing',
                'line' => 1
            ];
        }

        // Check for trailing whitespace
        if (preg_match('/\s+\n/', $code)) {
            $suggestions[] = [
                'type' => 'style',
                'severity' => 'low',
                'message' => 'Trailing whitespace detected - remove extra spaces at line ends',
                'line' => 1
            ];
        }

        return $suggestions;
    }

    private function generateBestPracticeSuggestions(string $code, string $language): array
    {
        $suggestions = [];

        // Check for error handling
        if (!$this->hasErrorHandling($code, $language)) {
            $suggestions[] = [
                'type' => 'best_practice',
                'severity' => 'medium',
                'message' => 'No error handling detected - add try-catch blocks',
                'line' => 1
            ];
        }

        // Check for input validation
        if (!$this->hasInputValidation($code, $language)) {
            $suggestions[] = [
                'type' => 'best_practice',
                'severity' => 'medium',
                'message' => 'No input validation detected - validate user inputs',
                'line' => 1
            ];
        }

        return $suggestions;
    }

    private function generateRefactoringSuggestions(string $code, string $language): array
    {
        $suggestions = [];

        // Suggest extracting complex logic
        if ($this->calculateComplexity($code, $language) > 8) {
            $suggestions[] = [
                'type' => 'refactoring',
                'severity' => 'medium',
                'message' => 'Consider extracting complex logic into separate methods',
                'line' => 1
            ];
        }

        return $suggestions;
    }

    private function findLineNumber(string $code, string $pattern): int
    {
        $lines = explode("\n", $code);
        
        foreach ($lines as $lineNum => $line) {
            if (preg_match('/' . $pattern . '/', $line)) {
                return $lineNum + 1;
            }
        }
        
        return 1;
    }

    private function findDuplicateLines(string $code): array
    {
        $lines = explode("\n", $code);
        $lineCounts = [];
        $duplicates = [];

        foreach ($lines as $lineNum => $line) {
            $line = trim($line);
            if (strlen($line) > 10) { // Only check lines with substantial content
                if (!isset($lineCounts[$line])) {
                    $lineCounts[$line] = [];
                }
                $lineCounts[$line][] = $lineNum + 1;
            }
        }

        foreach ($lineCounts as $line => $occurrences) {
            if (count($occurrences) > 2) { // Appears more than twice
                $duplicates[] = [
                    'line' => $occurrences[0],
                    'content' => $line,
                    'count' => count($occurrences)
                ];
            }
        }

        return $duplicates;
    }

    private function countParameters(string $code, string $language): int
    {
        $patterns = [
            'javascript' => '/function\s+\w+\s*\(([^)]*)\)/',
            'php' => '/function\s+\w+\s*\(([^)]*)\)/',
            'python' => '/def\s+\w+\s*\(([^)]*)\)/',
            'java' => '/\w+\s+\w+\s*\(([^)]*)\)/'
        ];

        $pattern = $patterns[$language] ?? '/function\s+\w+\s*\(([^)]*)\)/';
        preg_match($pattern, $code, $matches);

        if (isset($matches[1])) {
            $params = explode(',', $matches[1]);
            return count(array_filter($params, 'trim'));
        }

        return 0;
    }

    private function hasInconsistentIndentation(string $code): bool
    {
        $lines = explode("\n", $code);
        $indentTypes = [];

        foreach ($lines as $line) {
            if (preg_match('/^(\s+)/', $line, $matches)) {
                $indent = $matches[1];
                if (strpos($indent, "\t") !== false) {
                    $indentTypes[] = 'tab';
                } elseif (strpos($indent, "  ") !== false) {
                    $indentTypes[] = 'space2';
                } elseif (strpos($indent, "   ") !== false) {
                    $indentTypes[] = 'space3';
                } elseif (strpos($indent, "    ") !== false) {
                    $indentTypes[] = 'space4';
                }
            }
        }

        return count(array_unique($indentTypes)) > 1;
    }

    private function hasErrorHandling(string $code, string $language): bool
    {
        $patterns = [
            'javascript' => '/(try|catch|throw)/',
            'php' => '/(try|catch|throw)/',
            'python' => '/(try|except|raise)/',
            'java' => '/(try|catch|throw)/'
        ];

        $pattern = $patterns[$language] ?? '/(try|catch)/';
        return preg_match($pattern, $code);
    }

    private function hasInputValidation(string $code, string $language): bool
    {
        // This is a simplified check - in reality, you'd need more sophisticated analysis
        $validationPatterns = [
            'javascript' => '/(validate|check|verify|test)/',
            'php' => '/(filter_var|preg_match|validate)/',
            'python' => '/(validate|check|verify|isinstance)/'
        ];

        $pattern = $validationPatterns[$language] ?? '/(validate|check)/';
        return preg_match($pattern, $code);
    }
}