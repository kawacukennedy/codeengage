<?php

namespace App\Controllers\Api;

use PDO;
use App\Repositories\SnippetRepository;
use App\Helpers\ApiResponse;
use App\Helpers\ValidationHelper;
use App\Middleware\AuthMiddleware;
use App\Models\CodeAnalysis;

class AnalysisController
{
    private PDO $db;
    private SnippetRepository $snippetRepository;
    private AuthMiddleware $auth;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->snippetRepository = new SnippetRepository($db);
        $this->auth = new AuthMiddleware($db);
    }

    public function analyze(string $method, array $params): void
    {
        if ($method === 'POST') {
            $this->performAnalysis($params[0] ?? 0);
        } else {
            ApiResponse::error('Method not allowed', 405);
        }
    }

    public function snippet(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $id = (int)($params[0] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Invalid snippet ID');
        }

        try {
            $snippet = $this->snippetRepository->findById($id);
            if (!$snippet) {
                ApiResponse::error('Snippet not found', 404);
            }

            // Check view permissions
            if (!$this->canViewSnippet($snippet)) {
                ApiResponse::error('Access denied', 403);
            }

            // Get latest version for analysis
            $versions = $this->snippetRepository->getVersions($id);
            $latestVersion = !empty($versions) ? $versions[0] : null;

            if (!$latestVersion) {
                ApiResponse::error('No code found for analysis', 400);
            }

            $analysis = $latestVersion->getAnalysisResults();
            if ($analysis) {
                ApiResponse::success($analysis);
            } else {
                // Perform new analysis if none exists
                $code = $latestVersion->getCode();
                $language = $latestVersion->getLanguage();
                $newAnalysis = $this->performCodeAnalysis($code, $language);
                $this->storeAnalysisResults($latestVersion->getId(), $newAnalysis);
                ApiResponse::success($newAnalysis);
            }

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch analysis');
        }
    }

    public function batch(string $method, array $params): void
    {
        if ($method === 'POST') {
            $this->performBatchAnalysis();
        } else {
            ApiResponse::error('Method not allowed', 405);
        }
    }

    public function reanalyze(string $method, array $params): void
    {
        if ($method === 'POST') {
            $this->performReanalysis($params[0] ?? 0);
        } else {
            ApiResponse::error('Method not allowed', 405);
        }
    }

    private function performAnalysis(int $snippetId): void
    {
        $currentUser = $this->auth->optional();
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            // ValidationHelper::validateRequired($input, ['code', 'language']);
            
            $snippet = null;
            if ($snippetId > 0) {
                $snippet = $this->snippetRepository->findById($snippetId);
                if (!$snippet) {
                    ApiResponse::error('Snippet not found', 404);
                }

                // Check permissions
                if (!$this->canAnalyzeSnippet($snippet, $currentUser)) {
                    ApiResponse::error('Access denied', 403);
                }
            }

            $code = $snippet ? $this->getLatestVersionCode($snippet) : $input['code'];
            $language = $snippet ? $snippet->getLanguage() : $input['language'];

            $analysis = $this->performCodeAnalysis($code, $language);

            // Store analysis results
            if ($snippet) {
                $this->storeAnalysisResults($this->getLatestVersionId($snippet), $analysis);
            }

            ApiResponse::success($analysis, 'Analysis completed successfully');

        } catch (\App\Exceptions\ValidationException $e) {
            ApiResponse::error($e->getMessage(), 422, $e->getErrors());
        } catch (\Exception $e) {
            ApiResponse::error('Analysis failed');
        }
    }

    private function performBatchAnalysis(): void
    {
        $currentUser = $this->auth->handle();
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            ValidationHelper::validateRequired($input, ['snippet_ids']);
            
            $results = [];
            $errors = [];

            foreach ($input['snippet_ids'] as $snippetId) {
                try {
                    $snippet = $this->snippetRepository->findById((int)$snippetId);
                    if (!$snippet) {
                        $errors[] = "Snippet {$snippetId} not found";
                        continue;
                    }

                    if (!$this->canAnalyzeSnippet($snippet, $currentUser)) {
                        $errors[] = "No permission for snippet {$snippetId}";
                        continue;
                    }

                    // Check if analysis already exists
                    $versions = $this->snippetRepository->getVersions((int)$snippetId);
                    $latestVersion = !empty($versions) ? $versions[0] : null;

                    if ($latestVersion && $latestVersion->getAnalysisResults()) {
                        $results[] = [
                            'snippet_id' => (int)$snippetId,
                            'analysis' => $latestVersion->getAnalysisResults(),
                            'cached' => true
                        ];
                    } else {
                        $code = $latestVersion->getCode();
                        $analysis = $this->performCodeAnalysis($code, $snippet->getLanguage());
                        $this->storeAnalysisResults($latestVersion->getId(), $analysis);
                        
                        $results[] = [
                            'snippet_id' => (int)$snippetId,
                            'analysis' => $analysis,
                            'cached' => false
                        ];
                    }
                } catch (\Exception $e) {
                    $errors[] = "Analysis failed for snippet {$snippetId}: " . $e->getMessage();
                }
            }

            if (!empty($errors)) {
                ApiResponse::error('Some analyses failed', 400, ['errors' => $errors]);
            }

            ApiResponse::success($results, 'Batch analysis completed');

        } catch (\Exception $e) {
            ApiResponse::error('Batch analysis failed');
        }
    }

    private function performReanalysis(int $snippetId): void
    {
        $currentUser = $this->auth->handle();
        
        try {
            $snippet = $this->snippetRepository->findById($snippetId);
            if (!$snippet) {
                ApiResponse::error('Snippet not found', 404);
            }

            if (!$this->canAnalyzeSnippet($snippet, $currentUser)) {
                ApiResponse::error('Access denied', 403);
            }

            // Get latest version
            $versions = $this->snippetRepository->getVersions($snippetId);
            if (empty($versions)) {
                ApiResponse::error('No code found for analysis', 400);
            }

            $latestVersion = $versions[0];
            $code = $latestVersion->getCode();
            $language = $snippet->getLanguage();

            // Force new analysis
            $analysis = $this->performCodeAnalysis($code, $language);
            $this->storeAnalysisResults($latestVersion->getId(), $analysis);

            ApiResponse::success($analysis, 'Reanalysis completed successfully');

        } catch (\Exception $e) {
            ApiResponse::error('Reanalysis failed');
        }
    }

    private function performCodeAnalysis(string $code, string $language): array
    {
        // Use the CodeAnalysis helper class
        $analysis = new CodeAnalysis($code, $language);
        
        return [
            'snippet_id' => null, // Will be set by caller
            'complexity_score' => $analysis->getComplexityScore(),
            'security_issues' => $analysis->getSecurityIssues(),
            'performance_suggestions' => $analysis->getPerformanceSuggestions(),
            'code_smells' => $analysis->getCodeSmells(),
            'metrics' => [
                'lines_of_code' => $analysis->getLinesOfCode(),
                'character_count' => $analysis->getCharacterCount(),
                'functions' => $analysis->getFunctions(),
                'classes' => $analysis->getClasses(),
                'imports' => $analysis->getImports(),
                'language_detected' => $analysis->getDetectedLanguage()
            ],
            'analysis_type' => 'full',
            'analyzed_at' => date('Y-m-d H:i:s'),
            'analyzer_version' => '1.0.0'
        ];
    }

    private function storeAnalysisResults(int $snippetVersionId, array $analysis): void
    {
        $sql = "INSERT INTO code_analyses 
                (snippet_version_id, analysis_type, complexity_score, security_issues, performance_suggestions, code_smells, created_at) 
                VALUES 
                (:snippet_version_id, :analysis_type, :complexity_score, :security_issues, :performance_suggestions, :code_smells, :created_at)";
        
        $stmt = $this->db->prepare($sql);
        
        $stmt->execute([
            ':snippet_version_id' => $snippetVersionId,
            ':analysis_type' => $analysis['analysis_type'],
            ':complexity_score' => $analysis['complexity_score'],
            ':security_issues' => json_encode($analysis['security_issues']),
            ':performance_suggestions' => json_encode($analysis['performance_suggestions']),
            ':code_smells' => json_encode($analysis['code_smells']),
            ':created_at' => $analysis['analyzed_at']
        ]);
    }

    private function canViewSnippet($snippet, $user): bool
    {
        if (!$user) {
            return $snippet->getVisibility() === 'public';
        }

        // Owner can view their own snippets
        if ($user->getId() === $snippet->getAuthorId()) {
            return true;
        }

        // Public snippets are viewable by anyone
        if ($snippet->getVisibility() === 'public') {
            return true;
        }

        // Organization snippets require membership
        if ($snippet->getVisibility() === 'organization') {
            // Simplified check - in real implementation, check org membership
            return $user->getId() === $snippet->getAuthorId();
        }

        return false;
    }

    private function canAnalyzeSnippet($snippet, $user): bool
    {
        if (!$user) {
            return false; // Analysis requires authentication
        }

        // Owner can analyze their own snippets
        if ($user->getId() === $snippet->getAuthorId()) {
            return true;
        }

        // Public snippets can be analyzed by authenticated users
        if ($snippet->getVisibility() === 'public') {
            return true;
        }

        // Organization snippets require membership
        if ($snippet->getVisibility() === 'organization') {
            // Simplified check - in real implementation, check org membership
            return $user->getId() === $snippet->getAuthorId();
        }

        return false;
    }
}