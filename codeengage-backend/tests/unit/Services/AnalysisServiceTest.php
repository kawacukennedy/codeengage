<?php
/**
 * AnalysisService Unit Tests
 * 
 * Tests for code analysis service including complexity, security, and performance analysis.
 */

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\AnalysisService;
use PDO;

class AnalysisServiceTest extends TestCase
{
    private AnalysisService $analysisService;
    private $mockDb;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->mockDb = $this->createMockPDO();
        $this->analysisService = new AnalysisService($this->mockDb);
    }

    /**
     * Test complexity calculation for simple code
     */
    public function testComplexityCalculationSimpleCode(): void
    {
        $simpleCode = 'console.log("Hello, World!");';
        
        $complexity = $this->calculateBasicComplexity($simpleCode);
        
        $this->assertEquals(1, $complexity, 'Simple code should have complexity of 1');
    }

    /**
     * Test complexity increases with conditionals
     */
    public function testComplexityIncreasesWithConditionals(): void
    {
        $codeWithIf = '
            if (x > 0) {
                console.log("positive");
            }
        ';
        
        $codeWithIfElse = '
            if (x > 0) {
                console.log("positive");
            } else if (x < 0) {
                console.log("negative");
            } else {
                console.log("zero");
            }
        ';
        
        $complexity1 = $this->calculateBasicComplexity($codeWithIf);
        $complexity2 = $this->calculateBasicComplexity($codeWithIfElse);
        
        $this->assertGreaterThan($complexity1, $complexity2, 'More conditionals should increase complexity');
    }

    /**
     * Test complexity increases with loops
     */
    public function testComplexityIncreasesWithLoops(): void
    {
        $codeWithLoop = '
            for (let i = 0; i < 10; i++) {
                console.log(i);
            }
        ';
        
        $codeWithNestedLoop = '
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    console.log(i, j);
                }
            }
        ';
        
        $complexity1 = $this->calculateBasicComplexity($codeWithLoop);
        $complexity2 = $this->calculateBasicComplexity($codeWithNestedLoop);
        
        $this->assertGreaterThan($complexity1, $complexity2, 'Nested loops should increase complexity');
    }

    /**
     * Test SQL injection detection in PHP
     */
    public function testSqlInjectionDetectionPhp(): void
    {
        $vulnerableCode = '
            $query = "SELECT * FROM users WHERE id = " . $_GET["id"];
            mysqli_query($conn, $query);
        ';
        
        $issues = $this->scanForSqlInjection($vulnerableCode, 'php');
        
        $this->assertNotEmpty($issues, 'Should detect SQL injection vulnerability');
    }

    /**
     * Test XSS detection in JavaScript
     */
    public function testXssDetectionJavaScript(): void
    {
        $vulnerableCode = '
            document.innerHTML = userInput;
            element.innerHTML = data;
        ';
        
        $issues = $this->scanForXss($vulnerableCode, 'javascript');
        
        $this->assertNotEmpty($issues, 'Should detect XSS vulnerability');
    }

    /**
     * Test safe code passes security scan
     */
    public function testSafeCodePassesSecurityScan(): void
    {
        $safeCode = '
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$id]);
        ';
        
        $issues = $this->scanForSqlInjection($safeCode, 'php');
        
        $this->assertEmpty($issues, 'Safe code should pass security scan');
    }

    /**
     * Test detection of eval usage
     */
    public function testEvalUsageDetection(): void
    {
        $codeWithEval = 'eval(userInput);';
        
        $issues = $this->scanForDangerousFunctions($codeWithEval, 'javascript');
        
        $this->assertNotEmpty($issues, 'Should detect eval usage');
    }

    /**
     * Test code smell detection - long function
     */
    public function testLongFunctionDetection(): void
    {
        // Generate a function with 60 lines
        $longFunction = "function longFunction() {\n";
        for ($i = 0; $i < 60; $i++) {
            $longFunction .= "    console.log({$i});\n";
        }
        $longFunction .= "}";
        
        $smells = $this->detectCodeSmells($longFunction);
        
        $this->assertNotEmpty($smells, 'Should detect long function');
    }

    /**
     * Test duplicate code detection
     */
    public function testDuplicateCodeDetection(): void
    {
        $codeWithDuplicates = '
            function processA() {
                const result = data.filter(x => x > 0).map(x => x * 2);
                return result;
            }
            
            function processB() {
                const result = data.filter(x => x > 0).map(x => x * 2);
                return result;
            }
        ';
        
        $duplicates = $this->detectDuplicateCode($codeWithDuplicates);
        
        $this->assertNotEmpty($duplicates, 'Should detect duplicate code');
    }

    /**
     * Test line count calculation
     */
    public function testLineCountCalculation(): void
    {
        $code = "line 1\nline 2\nline 3\nline 4\nline 5";
        
        $lines = substr_count($code, "\n") + 1;
        
        $this->assertEquals(5, $lines, 'Should count 5 lines');
    }

    /**
     * Test comment line detection
     */
    public function testCommentLineDetection(): void
    {
        $code = '
            // This is a comment
            const x = 1; // inline comment
            /* Multi-line
               comment */
            const y = 2;
        ';
        
        $commentPatterns = [
            '/\/\/.*$/m',           // Single-line comments
            '/\/\*[\s\S]*?\*\//'    // Multi-line comments
        ];
        
        $commentCount = 0;
        foreach ($commentPatterns as $pattern) {
            preg_match_all($pattern, $code, $matches);
            $commentCount += count($matches[0]);
        }
        
        $this->assertGreaterThan(0, $commentCount, 'Should detect comments');
    }

    /**
     * Test function count
     */
    public function testFunctionCountJavaScript(): void
    {
        $code = '
            function foo() {}
            const bar = function() {};
            const baz = () => {};
            class MyClass {
                method() {}
            }
        ';
        
        $functionPatterns = [
            '/function\s+\w+\s*\(/',
            '/\w+\s*=\s*function\s*\(/',
            '/\w+\s*=\s*\([^)]*\)\s*=>/',
            '/\w+\s*\([^)]*\)\s*\{/'
        ];
        
        $functionCount = 0;
        foreach ($functionPatterns as $pattern) {
            preg_match_all($pattern, $code, $matches);
            $functionCount += count($matches[0]);
        }
        
        $this->assertGreaterThanOrEqual(3, $functionCount, 'Should count at least 3 functions');
    }

    /**
     * Test performance suggestion for nested loops
     */
    public function testPerformanceSuggestionNestedLoops(): void
    {
        $code = '
            for (let i = 0; i < arr1.length; i++) {
                for (let j = 0; j < arr2.length; j++) {
                    for (let k = 0; k < arr3.length; k++) {
                        // O(n^3) complexity
                    }
                }
            }
        ';
        
        $suggestions = $this->analyzePerformance($code);
        
        $this->assertNotEmpty($suggestions, 'Should suggest optimization for nested loops');
    }

    /**
     * Helper: Calculate basic cyclomatic complexity
     */
    private function calculateBasicComplexity(string $code): int
    {
        $complexity = 1; // Base complexity
        
        $patterns = [
            '/\bif\s*\(/',
            '/\belse\s+if\s*\(/',
            '/\bfor\s*\(/',
            '/\bwhile\s*\(/',
            '/\bcase\s+/',
            '/\bcatch\s*\(/',
            '/\?\s*[^:]+\s*:/',  // Ternary operator
            '/&&/',
            '/\|\|/'
        ];
        
        foreach ($patterns as $pattern) {
            preg_match_all($pattern, $code, $matches);
            $complexity += count($matches[0]);
        }
        
        return $complexity;
    }

    /**
     * Helper: Scan for SQL injection vulnerabilities
     */
    private function scanForSqlInjection(string $code, string $language): array
    {
        $issues = [];
        
        if ($language === 'php') {
            // Look for direct variable concatenation in SQL
            if (preg_match('/["\'].*SELECT.*["\'].*\..*\$/', $code)) {
                $issues[] = 'Potential SQL injection: direct variable concatenation in query';
            }
            if (preg_match('/\$_(GET|POST|REQUEST)\[[\'"][^\'"]+[\'"]\]/', $code) && 
                preg_match('/(mysql_query|mysqli_query|->query)/', $code)) {
                $issues[] = 'Potential SQL injection: user input in query without prepared statements';
            }
        }
        
        return $issues;
    }

    /**
     * Helper: Scan for XSS vulnerabilities
     */
    private function scanForXss(string $code, string $language): array
    {
        $issues = [];
        
        if ($language === 'javascript') {
            if (preg_match('/\.innerHTML\s*=/', $code)) {
                $issues[] = 'Potential XSS: using innerHTML with untrusted data';
            }
            if (preg_match('/document\.write\s*\(/', $code)) {
                $issues[] = 'Potential XSS: using document.write';
            }
        }
        
        return $issues;
    }

    /**
     * Helper: Scan for dangerous functions
     */
    private function scanForDangerousFunctions(string $code, string $language): array
    {
        $issues = [];
        
        $dangerousFunctions = [
            'javascript' => ['eval', 'Function(', 'setTimeout(string', 'setInterval(string'],
            'php' => ['eval', 'exec', 'system', 'shell_exec', 'passthru']
        ];
        
        $functions = $dangerousFunctions[$language] ?? [];
        
        foreach ($functions as $func) {
            if (stripos($code, $func) !== false) {
                $issues[] = "Dangerous function detected: {$func}";
            }
        }
        
        return $issues;
    }

    /**
     * Helper: Detect code smells
     */
    private function detectCodeSmells(string $code): array
    {
        $smells = [];
        $lines = explode("\n", $code);
        
        // Long function detection (> 50 lines)
        if (count($lines) > 50) {
            $smells[] = 'Function is too long (> 50 lines)';
        }
        
        return $smells;
    }

    /**
     * Helper: Detect duplicate code
     */
    private function detectDuplicateCode(string $code): array
    {
        $duplicates = [];
        $lines = explode("\n", $code);
        $lineHashes = [];
        
        foreach ($lines as $index => $line) {
            $trimmed = trim($line);
            if (strlen($trimmed) > 10) { // Only check substantial lines
                $hash = md5($trimmed);
                if (isset($lineHashes[$hash])) {
                    $duplicates[] = "Duplicate at lines {$lineHashes[$hash]} and " . ($index + 1);
                }
                $lineHashes[$hash] = $index + 1;
            }
        }
        
        return $duplicates;
    }

    /**
     * Helper: Analyze performance
     */
    private function analyzePerformance(string $code): array
    {
        $suggestions = [];
        
        // Detect nested loops (3 levels)
        if (preg_match_all('/\bfor\s*\(/', $code, $matches) && count($matches[0]) >= 3) {
            $suggestions[] = 'Consider optimizing deeply nested loops (O(n^3) or higher complexity)';
        }
        
        return $suggestions;
    }
}
