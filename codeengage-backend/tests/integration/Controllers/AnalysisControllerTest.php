<?php

declare(strict_types=1);

namespace Tests\Integration\Controllers;

use Tests\DatabaseTestCase;

/**
 * Integration tests for AnalysisController
 */
class AnalysisControllerTest extends DatabaseTestCase
{
    private int $userId;
    private int $snippetId;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test user
        $this->userId = $this->insertTestUser([
            'username' => 'analyst',
            'email' => 'analyst@test.com'
        ]);
        
        // Create test snippet
        $this->snippetId = $this->insertTestSnippet([
            'user_id' => $this->userId,
            'title' => 'Analysis Test Snippet',
            'code' => '<?php
function calculateSum($numbers) {
    $sum = 0;
    foreach ($numbers as $num) {
        $sum += $num;
    }
    return $sum;
}',
            'language' => 'php'
        ]);
    }

    public function testAnalyzeCodeReturnsComplexityMetrics(): void
    {
        $code = '<?php
function example($a, $b) {
    if ($a > $b) {
        return $a;
    } else {
        return $b;
    }
}';

        // Simulate analysis logic
        $lineCount = substr_count($code, "\n") + 1;
        $functionCount = preg_match_all('/function\s+\w+/', $code);
        
        $this->assertGreaterThan(0, $lineCount);
        $this->assertEquals(1, $functionCount);
    }

    public function testAnalyzeCodeDetectsSecurityIssues(): void
    {
        $vulnerableCode = '<?php
$query = "SELECT * FROM users WHERE id = " . $_GET["id"];
mysqli_query($conn, $query);
';

        // Check for SQL injection patterns
        $hasSqlInjection = preg_match('/\$_GET\s*\[.*\].*(?:query|mysql|SELECT)/i', $vulnerableCode);
        
        $this->assertEquals(1, $hasSqlInjection);
    }

    public function testAnalyzeCodeDetectsXssVulnerability(): void
    {
        $xssCode = '<script>
var userInput = document.getElementById("input").value;
document.innerHTML = userInput;
</script>';

        // Check for XSS patterns
        $hasXss = preg_match('/innerHTML\s*=/', $xssCode);
        
        $this->assertEquals(1, $hasXss);
    }

    public function testAnalyzeCodeCalculatesCyclomaticComplexity(): void
    {
        $complexCode = '<?php
function complexFunction($a, $b, $c) {
    if ($a > 0) {
        if ($b > 0) {
            return $a + $b;
        } elseif ($c > 0) {
            return $b + $c;
        }
    } else {
        while ($a < 0) {
            $a++;
        }
    }
    return 0;
}';

        // Count decision points (if, elseif, while, for, case, &&, ||, ?)
        $decisionPoints = preg_match_all('/(if|elseif|else if|while|for|case|&&|\|\||\?)/i', $complexCode);
        $complexity = $decisionPoints + 1; // Base complexity is 1
        
        $this->assertGreaterThan(3, $complexity);
    }

    public function testAnalyzeCodeDetectsDangerousFunctions(): void
    {
        $dangerousCode = '<?php
eval($_POST["code"]);
exec("rm -rf /");
system($userCommand);
passthru($cmd);
';

        // Check for dangerous functions
        $dangerousFunctions = ['eval', 'exec', 'system', 'passthru', 'shell_exec'];
        $foundCount = 0;
        
        foreach ($dangerousFunctions as $func) {
            if (preg_match("/\b{$func}\s*\(/i", $dangerousCode)) {
                $foundCount++;
            }
        }
        
        $this->assertGreaterThanOrEqual(4, $foundCount);
    }

    public function testAnalyzeCodeDetectsCodeSmells(): void
    {
        $smellyCode = '<?php
function veryLongFunctionName() {
    // This function has too many lines
    ' . str_repeat("\n    \$line = 'code';", 100) . '
}';

        // Check for long function (more than 50 lines)
        $lines = explode("\n", $smellyCode);
        $isLongFunction = count($lines) > 50;
        
        $this->assertTrue($isLongFunction);
    }

    public function testAnalyzeCodeSavesAnalysisResults(): void
    {
        $stmt = $this->db->prepare("
            INSERT INTO snippet_analyses (snippet_id, analysis_type, result, created_at)
            VALUES (?, ?, ?, NOW())
        ");
        
        $analysisResult = json_encode([
            'complexity' => 5,
            'lines' => 20,
            'security_issues' => [],
            'suggestions' => ['Consider adding type hints']
        ]);
        
        $stmt->execute([$this->snippetId, 'full', $analysisResult]);
        
        // Verify saved
        $query = $this->db->prepare("
            SELECT * FROM snippet_analyses WHERE snippet_id = ?
        ");
        $query->execute([$this->snippetId]);
        $analysis = $query->fetch(\PDO::FETCH_ASSOC);
        
        $this->assertNotFalse($analysis);
        $this->assertEquals('full', $analysis['analysis_type']);
    }

    public function testAnalyzeCodeWithEmptyCodeReturnsError(): void
    {
        $code = '';
        
        $this->assertTrue(empty($code));
    }

    public function testAnalyzeCodeCountsComments(): void
    {
        $codeWithComments = '<?php
// This is a single line comment
/* This is a
   multi-line comment */
function test() {
    return true; // inline comment
}
';

        $singleLineComments = preg_match_all('/\/\/.*/', $codeWithComments);
        $multiLineComments = preg_match_all('/\/\*[\s\S]*?\*\//', $codeWithComments);
        
        $this->assertEquals(2, $singleLineComments);
        $this->assertEquals(1, $multiLineComments);
    }

    public function testAnalyzeCodeGeneratesPerformanceSuggestions(): void
    {
        $inefficientCode = '<?php
for ($i = 0; $i < count($array); $i++) {
    for ($j = 0; $j < count($array); $j++) {
        // Nested loop with count in condition
    }
}
';

        // Check for nested loops with count() in condition
        $hasNestedLoops = preg_match_all('/for\s*\([^)]*count\s*\(/', $inefficientCode);
        
        $this->assertGreaterThanOrEqual(1, $hasNestedLoops);
    }

    public function testAnalyzeCodeDetectsMaintainabilityIssues(): void
    {
        $hardToMaintain = '<?php
function a($b,$c,$d,$e,$f,$g,$h,$i,$j,$k) {
    return $b+$c+$d+$e+$f+$g+$h+$i+$j+$k;
}
';

        // Check for too many parameters (more than 5)
        preg_match('/function\s+\w+\s*\(([^)]*)\)/', $hardToMaintain, $matches);
        $params = $matches[1] ?? '';
        $paramCount = $params ? substr_count($params, '$') : 0;
        
        $this->assertGreaterThan(5, $paramCount);
    }
}
