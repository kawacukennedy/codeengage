<?php

namespace App\Services;

class AnalysisService
{
    private $analysisRepository;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->analysisRepository = new \App\Repositories\AnalysisRepository($pdo);
    }

    public function analyze($code, $language)
    {
        $complexity = \App\Helpers\CodeHelper::calculateComplexity($code);
        $loc = substr_count($code, "\n") + 1;
        
        $securityIssues = \App\Helpers\CodeHelper::detectSecurityIssues($code, $language);
        $performanceSuggestions = \App\Helpers\CodeHelper::detectPerformanceIssues($code);
        $duplicates = \App\Helpers\CodeHelper::detectDuplicates($code);
        $codeSmells = \App\Helpers\CodeHelper::detectCodeSmells($code);

        return [
            'complexity' => $complexity,
            'loc' => $loc,
            'language' => $language,
            'security_issues' => $securityIssues,
            'performance_suggestions' => $performanceSuggestions,
            'duplicates' => $duplicates,
            'code_smells' => $codeSmells,
            'analyzed_at' => date('Y-m-d H:i:s')
        ];
    }

    public function storeAnalysis(int $versionId, array $analysisData, string $type = 'comprehensive')
    {
        return $this->analysisRepository->create([
            'snippet_version_id' => $versionId,
            'analysis_type' => $type,
            'complexity_score' => $analysisData['complexity'] ?? 0,
            'security_issues' => $analysisData['security_issues'] ?? [],
            'performance_suggestions' => $analysisData['performance_suggestions'] ?? [],
            'code_smells' => $analysisData['code_smells'] ?? []
        ]);
    }

    public function getHistory(int $snippetId)
    {
        return $this->analysisRepository->findBySnippet($snippetId);
    }

    public function getByVersion(int $versionId)
    {
        return $this->analysisRepository->findByVersion($versionId);
    }
}