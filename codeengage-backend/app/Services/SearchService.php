<?php

namespace App\Services;

use App\Repositories\SnippetRepository;
use App\Repositories\TagRepository;
use App\Repositories\UserRepository;
use App\Helpers\CodeHelper;

class SearchService
{
    private SnippetRepository $snippetRepository;
    private TagRepository $tagRepository;
    private UserRepository $userRepository;
    private array $config;

    public function __construct(
        SnippetRepository $snippetRepository,
        TagRepository $tagRepository,
        UserRepository $userRepository,
        array $config = []
    ) {
        $this->snippetRepository = $snippetRepository;
        $this->tagRepository = $tagRepository;
        $this->userRepository = $userRepository;
        $this->config = array_merge([
            'results_per_page' => 20,
            'max_results' => 1000,
            'similarity_threshold' => 0.3
        ], $config);
    }

    public function search(array $params): array
    {
        $query = $params['q'] ?? '';
        $filters = $params['filters'] ?? [];
        $sort = $params['sort'] ?? 'relevance';
        $page = max(1, (int)($params['page'] ?? 1));
        $limit = min($this->config['max_results'], max(1, (int)($params['limit'] ?? $this->config['results_per_page'])));
        $offset = ($page - 1) * $limit;

        if (empty($query)) {
            return $this->browseSnippets($filters, $sort, $limit, $offset);
        }

        // Perform full-text search
        $results = $this->performFullTextSearch($query, $filters, $sort, $limit, $offset);
        
        // Add semantic search results if requested
        if (!empty($params['semantic']) && !empty($results['snippets'])) {
            $semanticResults = $this->performSemanticSearch($query, $filters, $limit);
            $results['snippets'] = $this->mergeResults($results['snippets'], $semanticResults);
        }

        // Calculate relevance scores
        $results['snippets'] = $this->calculateRelevanceScores($results['snippets'], $query);

        // Sort by relevance or other criteria
        $results['snippets'] = $this->sortResults($results['snippets'], $sort);

        return $results;
    }

    public function suggestTags(string $query, int $limit = 10): array
    {
        return $this->tagRepository->searchByName($query, $limit);
    }

    public function suggestUsers(string $query, int $limit = 10): array
    {
        return $this->userRepository->searchByDisplayName($query, $limit);
    }

    public function getSimilarSnippets(int $snippetId, int $limit = 5): array
    {
        $snippet = $this->snippetRepository->findById($snippetId);
        if (!$snippet) {
            return [];
        }

        // Get similar snippets based on language, tags, and content similarity
        $similarByLanguage = $this->snippetRepository->findByLanguage($snippet['language'], $limit * 2);
        $similarByTags = $this->snippetRepository->findByTags($snippet['tags'] ?? [], $limit * 2);

        // Combine and deduplicate
        $candidates = [];
        foreach ($similarByLanguage as $candidate) {
            if ($candidate['id'] !== $snippetId) {
                $candidates[$candidate['id']] = $candidate;
            }
        }
        foreach ($similarByTags as $candidate) {
            if ($candidate['id'] !== $snippetId) {
                $candidates[$candidate['id']] = $candidate;
            }
        }

        // Calculate similarity scores
        $similarities = [];
        foreach ($candidates as $candidate) {
            $similarities[$candidate['id']] = $this->calculateSnippetSimilarity($snippet, $candidate);
        }

        // Sort by similarity and return top results
        arsort($similarities);
        $results = [];
        $count = 0;
        foreach ($similarities as $id => $similarity) {
            if ($count >= $limit) break;
            if ($similarity > $this->config['similarity_threshold']) {
                $results[] = array_merge($candidates[$id], ['similarity_score' => $similarity]);
                $count++;
            }
        }

        return $results;
    }

    public function getTrendingSnippets(int $limit = 10): array
    {
        $timeframe = '7 DAYS';
        return $this->snippetRepository->findTrending($timeframe, $limit);
    }

    public function getPopularTags(int $limit = 20): array
    {
        return $this->tagRepository->findPopular($limit);
    }

    private function browseSnippets(array $filters, string $sort, int $limit, int $offset): array
    {
        $snippets = $this->snippetRepository->findAllWithFilters($filters, $sort, $limit, $offset);
        $total = $this->snippetRepository->countWithFilters($filters);

        return [
            'snippets' => $snippets,
            'pagination' => [
                'page' => floor($offset / $limit) + 1,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ],
            'search_time' => 0,
            'query' => '',
            'total' => $total
        ];
    }

    private function performFullTextSearch(string $query, array $filters, string $sort, int $limit, int $offset): array
    {
        $startTime = microtime(true);
        
        $snippets = $this->snippetRepository->fullTextSearch($query, $filters, $sort, $limit, $offset);
        $total = $this->snippetRepository->fullTextSearchCount($query, $filters);

        return [
            'snippets' => $snippets,
            'pagination' => [
                'page' => floor($offset / $limit) + 1,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ],
            'search_time' => microtime(true) - $startTime,
            'query' => $query,
            'total' => $total
        ];
    }

    private function performSemanticSearch(string $query, array $filters, int $limit): array
    {
        // Extract key concepts from the query
        $concepts = $this->extractConcepts($query);
        
        // Search for snippets containing similar concepts
        $semanticResults = [];
        foreach ($concepts as $concept) {
            $results = $this->snippetRepository->findByConcept($concept, $filters, $limit);
            $semanticResults = array_merge($semanticResults, $results);
        }

        // Remove duplicates and re-sort by semantic relevance
        $semanticResults = $this->deduplicateResults($semanticResults);
        $semanticResults = array_slice($semanticResults, 0, $limit);

        return $semanticResults;
    }

    private function extractConcepts(string $text): array
    {
        // Simple concept extraction - can be enhanced with NLP libraries
        $words = preg_split('/\s+/', strtolower($text));
        $concepts = [];
        
        // Extract programming-related terms
        $programmingTerms = [
            'function', 'class', 'method', 'variable', 'array', 'string', 'object',
            'database', 'query', 'api', 'rest', 'http', 'json', 'xml', 'html',
            'css', 'javascript', 'php', 'python', 'java', 'react', 'vue', 'angular',
            'algorithm', 'sort', 'search', 'loop', 'condition', 'recursion'
        ];

        foreach ($words as $word) {
            if (strlen($word) > 2 && in_array($word, $programmingTerms)) {
                $concepts[] = $word;
            }
        }

        return array_unique($concepts);
    }

    private function calculateSnippetSimilarity(array $snippet1, array $snippet2): float
    {
        $similarity = 0.0;

        // Language similarity (weight: 0.3)
        if ($snippet1['language'] === $snippet2['language']) {
            $similarity += 0.3;
        }

        // Tag similarity (weight: 0.4)
        $tags1 = array_column($snippet1['tags'] ?? [], 'name');
        $tags2 = array_column($snippet2['tags'] ?? [], 'name');
        $commonTags = array_intersect($tags1, $tags2);
        $totalTags = array_unique(array_merge($tags1, $tags2));
        if (!empty($totalTags)) {
            $tagSimilarity = count($commonTags) / count($totalTags);
            $similarity += $tagSimilarity * 0.4;
        }

        // Content similarity (weight: 0.3)
        $content1 = strtolower($snippet1['title'] . ' ' . ($snippet1['description'] ?? ''));
        $content2 = strtolower($snippet2['title'] . ' ' . ($snippet2['description'] ?? ''));
        $contentSimilarity = $this->calculateTextSimilarity($content1, $content2);
        $similarity += $contentSimilarity * 0.3;

        // Author Affinity (Bonus: 0.1)
        if (($snippet1['author_id'] ?? 0) === ($snippet2['author_id'] ?? -1)) {
            $similarity += 0.1;
        }

        return $similarity;
    }

    private function calculateTextSimilarity(string $text1, string $text2): float
    {
        // Simple Jaccard similarity
        $words1 = array_unique(preg_split('/\s+/', $text1));
        $words2 = array_unique(preg_split('/\s+/', $text2));
        
        $intersection = array_intersect($words1, $words2);
        $union = array_unique(array_merge($words1, $words2));
        
        if (empty($union)) {
            return 0.0;
        }
        
        return count($intersection) / count($union);
    }

    private function calculateRelevanceScores(array $snippets, string $query): array
    {
        foreach ($snippets as &$snippet) {
            $score = 0.0;
            $queryWords = preg_split('/\s+/', strtolower($query));
            
            // Title matches (highest weight)
            $title = strtolower($snippet['title'] ?? '');
            foreach ($queryWords as $word) {
                if (strpos($title, $word) !== false) {
                    $score += 0.4;
                }
            }
            
            // Description matches (medium weight)
            $description = strtolower($snippet['description'] ?? '');
            foreach ($queryWords as $word) {
                if (strpos($description, $word) !== false) {
                    $score += 0.3;
                }
            }
            
            // Code matches (lower weight)
            $code = strtolower($snippet['latest_version']['code'] ?? '');
            foreach ($queryWords as $word) {
                if (strpos($code, $word) !== false) {
                    $score += 0.2;
                }
            }
            
            // Language match
            foreach ($queryWords as $word) {
                if (strtolower($snippet['language']) === $word) {
                    $score += 0.1;
                }
            }
            
            // Boost for recent activity and popularity
            $daysSinceCreated = (time() - strtotime($snippet['created_at'])) / 86400;
            if ($daysSinceCreated < 7) {
                $score += 0.1;
            }
            
            $snippet['relevance_score'] = min(1.0, $score);
        }
        
        return $snippets;
    }

    private function mergeResults(array $primaryResults, array $secondaryResults): array
    {
        $merged = [];
        $seen = [];

        // Add primary results
        foreach ($primaryResults as $result) {
            $merged[] = $result;
            $seen[$result['id']] = true;
        }

        // Add secondary results that aren't already present
        foreach ($secondaryResults as $result) {
            if (!isset($seen[$result['id']])) {
                $merged[] = $result;
                $seen[$result['id']] = true;
            }
        }

        return $merged;
    }

    private function deduplicateResults(array $results): array
    {
        $seen = [];
        $deduplicated = [];

        foreach ($results as $result) {
            if (!isset($seen[$result['id']])) {
                $deduplicated[] = $result;
                $seen[$result['id']] = true;
            }
        }

        return $deduplicated;
    }

    private function sortResults(array $snippets, string $sort): array
    {
        switch ($sort) {
            case 'relevance':
                usort($snippets, function($a, $b) {
                    return ($b['relevance_score'] ?? 0) <=> ($a['relevance_score'] ?? 0);
                });
                break;
            case 'recent':
                usort($snippets, function($a, $b) {
                    return strtotime($b['created_at']) <=> strtotime($a['created_at']);
                });
                break;
            case 'popular':
                usort($snippets, function($a, $b) {
                    return ($b['star_count'] ?? 0) <=> ($a['star_count'] ?? 0);
                });
                break;
            case 'views':
                usort($snippets, function($a, $b) {
                    return ($b['view_count'] ?? 0) <=> ($a['view_count'] ?? 0);
                });
                break;
            case 'complexity':
                usort($snippets, function($a, $b) {
                    $aComplexity = $a['latest_version']['analysis_results']['complexity_score'] ?? 0;
                    $bComplexity = $b['latest_version']['analysis_results']['complexity_score'] ?? 0;
                    return $bComplexity <=> $aComplexity;
                });
                break;
        }

        return $snippets;
    }
}