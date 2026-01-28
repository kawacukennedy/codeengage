<?php

namespace App\Services;

use App\Models\Snippet;
use App\Helpers\ApiResponse;

class SnippetService
{
    private $snippetModel;

    public function __construct($pdo)
    {
        $this->snippetModel = new Snippet($pdo);
    }

    public function create(array $data, $userId)
    {
        if (empty($data['title']) || empty($data['code']) || empty($data['language'])) {
            ApiResponse::error('Missing required fields', 422);
        }

        $data['author_id'] = $userId;
        
        try {
            // Start transaction
            // Only hypothetical here as I'm not accessing PDO object directly to beginTransaction
            // But usually model calls should be wrapped.
            
            $snippetId = $this->snippetModel->create($data);
            $this->snippetModel->createVersion($snippetId, $data['code'], $userId, 1);
            
            return $this->get($snippetId);
            
        } catch (\Exception $e) {
            ApiResponse::error('Failed to create snippet: ' . $e->getMessage(), 500);
        }
    }

    public function list($filters)
    {
        return $this->snippetModel->findAll($filters);
    }

    public function get($id)
    {
        $snippet = $this->snippetModel->findById($id);
        if (!$snippet) {
            ApiResponse::error('Snippet not found', 404);
        }
        
        $version = $this->snippetModel->getLatestVersion($id);
        $snippet['code'] = $version ? $version['code'] : '';
        $snippet['version'] = $version ? $version['version_number'] : 0;
        
        return $snippet;
    }
}