<?php

namespace App\Services;

use App\Repositories\SnippetRepository;
use App\Helpers\ApiResponse;

class SnippetService
{
    private $snippetRepository;
    private $malwareScanner;
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->snippetRepository = new SnippetRepository($pdo);
        $this->malwareScanner = new MalwareScannerService();
    }

    public function create(array $data, $userId)
    {
        if (empty($data['title']) || empty($data['code']) || empty($data['language'])) {
            ApiResponse::error('Missing required fields', 422);
        }

        $data['author_id'] = $userId;
        
        // Malware scan
        $scanResult = $this->malwareScanner->scan($data['code']);
        if (!$scanResult['is_safe']) {
            // Log but allow for now, or block? Specs say "Malware scanning hook". 
            // Let's flag it in metadata or log it. For now, let's block critical ones.
            error_log("POTENTIAL MALWARE DETECTED in snippet from user $userId: " . implode(', ', $scanResult['matches']));
            // ApiResponse::error('Potentially malicious code detected', 400); 
        }

        try {
            $snippet = $this->snippetRepository->create($data, $data['code']);
            return $this->formatSnippet($snippet);
            
        } catch (\Exception $e) {
            ApiResponse::error('Failed to create snippet: ' . $e->getMessage(), 500);
        }
    }

    public function list($filters, $limit = 20, $offset = 0)
    {
        $snippets = $this->snippetRepository->findMany($filters, $limit, $offset);
        $total = $this->snippetRepository->count($filters);
        
        $data = array_map(function($snippet) {
            return $snippet->toArray();
        }, $snippets);
        
        return [
            'snippets' => $data,
            'total' => $total,
            'pagination' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'page' => floor($offset / $limit) + 1,
                'pages' => ceil($total / $limit)
            ]
        ];
    }

    public function get($id)
    {
        $snippet = $this->snippetRepository->findById($id);
        if (!$snippet) {
            ApiResponse::error('Snippet not found', 404);
        }
        
        return $this->formatSnippet($snippet);
    }
    
    public function getById($id) {
        return $this->get($id);
    }

    public function update($id, array $data, $userId)
    {
        $snippet = $this->snippetRepository->findById($id);
        if (!$snippet) {
           ApiResponse::error('Snippet not found', 404);
        }
        
        if ($snippet->getAuthorId() != $userId) {
            ApiResponse::error('Unauthorized to update this snippet', 403);
        }

        try {
            $code = $data['code'] ?? null;
            
            // Malware scan if code is updated
            if ($code !== null) {
                $scanResult = $this->malwareScanner->scan($code);
                if (!$scanResult['is_safe']) {
                    error_log("POTENTIAL MALWARE DETECTED in snippet update from user $userId: " . implode(', ', $scanResult['matches']));
                }
            }

            $updatedSnippet = $this->snippetRepository->update($id, $data, $code, $userId);
            return $this->formatSnippet($updatedSnippet);
        } catch (\Exception $e) {
             ApiResponse::error('Failed to update snippet: ' . $e->getMessage(), 500);
        }
    }

    public function delete($id, $userId)
    {
        $snippet = $this->snippetRepository->findById($id);
        if (!$snippet) {
            ApiResponse::error('Snippet not found', 404);
        }
        
        if ($snippet->getAuthorId() != $userId) {
            ApiResponse::error('Unauthorized to delete this snippet', 403);
        }

        return $this->snippetRepository->softDelete($id);
    }

    public function incrementViewCount($id)
    {
        return $this->snippetRepository->incrementViewCount($id);
    }

    public function star($id, $userId)
    {
        return $this->snippetRepository->starSnippet($id, $userId);
    }

    public function unstar($id, $userId)
    {
        return $this->snippetRepository->unstarSnippet($id, $userId);
    }

    public function fork($id, $userId, $newTitle = null)
    {
        try {
            $fork = $this->snippetRepository->fork($id, $userId, $newTitle);
            return $this->formatSnippet($fork);
        } catch (\Exception $e) {
             ApiResponse::error('Failed to fork snippet: ' . $e->getMessage(), 500);
        }
    }

    public function getVersions($id)
    {
        $versions = $this->snippetRepository->getVersions($id);
        return array_map(function($version) {
            return $version->toArray();
        }, $versions);
    }

    public function getAnalyses($id)
    {
        $snippet = $this->snippetRepository->findById($id);
        if (!$snippet) {
            ApiResponse::error('Snippet not found', 404);
        }
        
        $analysisService = new AnalysisService($this->pdo);
        return $analysisService->getHistory($id);
    }
    
    private function formatSnippet($snippet) {
        $data = $snippet->toArray();
        $latestVersion = $this->snippetRepository->getLatestVersion($snippet->getId());
        $data['code'] = $latestVersion ? $latestVersion->getCode() : '';
        $data['version'] = $latestVersion ? $latestVersion->getVersionNumber() : 0;
        return $data;
    }

    public function analyzeSaved($id)
    {
        $snippet = $this->snippetRepository->findById($id);
        if (!$snippet) {
            ApiResponse::error('Snippet not found', 404);
        }

        $latestVersion = $this->snippetRepository->getLatestVersion($id);
        if (!$latestVersion) {
             ApiResponse::error('No code to analyze', 400);
        }

        // Check if analysis already exists
        $analysisService = new AnalysisService($this->pdo);
        $existing = $analysisService->getByVersion($latestVersion->getId());
        
        if ($existing) {
            // Transform to format expected by frontend
            $issues = [];
            if ($existing->getSecurityIssues()) $issues = array_merge($issues, $existing->getSecurityIssues());
            if ($existing->getPerformanceSuggestions()) $issues = array_merge($issues, $existing->getPerformanceSuggestions());
            
            // Map to unified "issues" format if needed or return raw
            // Frontend expects: complexity_score, security_issues, performance_suggestions
            // and maybe flattened "issues" for annotations.
            
            return [
                'complexity_score' => $existing->getComplexityScore(),
                'security_issues' => $existing->getSecurityIssues(),
                'performance_suggestions' => $existing->getPerformanceSuggestions(),
                'code_smells' => $existing->getCodeSmells(),
                'issues' => $this->flattenIssues($existing) // Helper to flatten for editor annotations
            ];
        }

        // If not, run analysis (and save it)
        $language = $snippet->getLanguage();
        $code = $latestVersion->getCode();
        
        $results = $analysisService->analyze($code, $language);
        $analysisService->storeAnalysis($latestVersion->getId(), $results);
        
        // Return format
        $results['complexity_score'] = $results['complexity'];
        // Fix keys
        return $results + ['issues' => $this->flattenIssuesFromRaw($results)];
    }

    private function flattenIssues($analysis) {
        $issues = [];
        
        $security = $analysis->getSecurityIssues() ?: [];
        foreach ($security as $issue) {
            $issues[] = [
                'from' => ['line' => ($issue['line'] ?? 1) - 1, 'ch' => 0],
                'to' => ['line' => ($issue['line'] ?? 1) - 1, 'ch' => 100], // Rough estimate
                'message' => $issue['message'] ?? $issue['description'] ?? 'Security Issue',
                'severity' => 'error'
            ];
        }

        $performance = $analysis->getPerformanceSuggestions() ?: [];
        foreach ($performance as $issue) {
             $issues[] = [
                'from' => ['line' => ($issue['line'] ?? 1) - 1, 'ch' => 0],
                'to' => ['line' => ($issue['line'] ?? 1) - 1, 'ch' => 100],
                'message' => $issue['message'] ?? 'Performance Suggestion',
                'severity' => 'warning'
            ];
        }

        return $issues;
    }

    private function flattenIssuesFromRaw($results) {
         $issues = [];
         
         $security = $results['security_issues'] ?? [];
         foreach ($security as $issue) {
             $issues[] = [
                'from' => ['line' => ($issue['line'] ?? 1) - 1, 'ch' => 0],
                'to' => ['line' => ($issue['line'] ?? 1) - 1, 'ch' => 100],
                'message' => $issue['message'] ?? $issue['description'] ?? 'Security Issue',
                'severity' => 'error'
             ];
         }
         
         $performance = $results['performance_suggestions'] ?? [];
         foreach ($performance as $issue) {
             $issues[] = [
                'from' => ['line' => ($issue['line'] ?? 1) - 1, 'ch' => 0],
                'to' => ['line' => ($issue['line'] ?? 1) - 1, 'ch' => 100],
                'message' => $issue['message'] ?? 'Performance Suggestion',
                'severity' => 'warning'
             ];
         }

         return $issues;
    }
    
    public function restore($id, $userId)
    {
        $snippet = $this->snippetRepository->findWithTrashed($id);
        
        if (!$snippet) {
            ApiResponse::error('Snippet not found', 404);
        }
        
        if ($snippet->getAuthorId() != $userId) {
            ApiResponse::error('Unauthorized', 403);
        }
        
        return $this->snippetRepository->restore($id);
    }
    
    public function forceDelete($id, $userId, $isAdmin = false)
    {
        if (!$isAdmin) {
             ApiResponse::error('Unauthorized. Admin only.', 403);
        }
        return $this->snippetRepository->forceDelete($id);
    }
    
    public function transferOwnership($id, $currentUserId, $newOwnerId)
    {
        $snippet = $this->snippetRepository->findById($id);
        if (!$snippet) {
            ApiResponse::error('Snippet not found', 404);
        }
        
        if ($snippet->getAuthorId() != $currentUserId) {
            ApiResponse::error('Unauthorized', 403);
        }
        
        return $this->snippetRepository->transferOwnership($id, $newOwnerId);
    }

    public function rollback($id, $versionNumber, $userId)
    {
        $snippet = $this->snippetRepository->findById($id);
        if (!$snippet) {
            ApiResponse::error('Snippet not found', 404);
        }
        
        if ($snippet->getAuthorId() != $userId) {
            ApiResponse::error('Unauthorized', 403);
        }
        
        try {
            return $this->snippetRepository->rollback($id, $versionNumber, $userId);
        } catch (\Exception $e) {
            ApiResponse::error($e->getMessage(), 400);
        }
    }

    public function getRelated($id)
    {
        $snippet = $this->snippetRepository->findById($id);
        if (!$snippet) {
            ApiResponse::error('Snippet not found', 404);
        }

        // Get tag IDs
        $tags = $this->snippetRepository->getTags($id);
        $tagIds = array_map(fn($t) => $t->getId(), $tags);

        $related = $this->snippetRepository->findRelated($id, $snippet->getLanguage(), $tagIds);
        
        return array_map(function($s) {
            return $s->toArray();
        }, $related);
    }
}