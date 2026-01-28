<?php

namespace App\Models;

use PDO;

class Snippet
{
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(array $data)
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO snippets (
                author_id, title, description, visibility, language, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['author_id'],
            $data['title'],
            $data['description'] ?? '',
            $data['visibility'] ?? 'public',
            $data['language'],
            date('Y-m-d H:i:s')
        ]);
        
        return $this->pdo->lastInsertId();
    }

    public function createVersion($snippetId, $code, $editorId, $versionNumber = 1)
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO snippet_versions (
                snippet_id, version_number, code, checksum, editor_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $checksum = hash('sha256', $code);
        
        $stmt->execute([
            $snippetId,
            $versionNumber,
            $code,
            $checksum,
            $editorId,
            date('Y-m-d H:i:s')
        ]);
        
        return $this->pdo->lastInsertId();
    }

    public function findAll($filters = [])
    {
        $sql = "SELECT s.*, u.username as author_name 
                FROM snippets s 
                JOIN users u ON s.author_id = u.id 
                WHERE s.deleted_at IS NULL";
                
        $params = [];
        
        if (!empty($filters['visibility'])) {
            $sql .= " AND s.visibility = ?";
            $params[] = $filters['visibility'];
        }
        
        if (!empty($filters['language'])) {
            $sql .= " AND s.language = ?";
            $params[] = $filters['language'];
        }
        
        $sql .= " ORDER BY s.created_at DESC LIMIT 20";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById($id)
    {
        $stmt = $this->pdo->prepare("
            SELECT s.*, u.username as author_name 
            FROM snippets s 
            JOIN users u ON s.author_id = u.id
            WHERE s.id = ? AND s.deleted_at IS NULL
        ");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    public function getLatestVersion($snippetId)
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM snippet_versions 
            WHERE snippet_id = ? 
            ORDER BY version_number DESC 
            LIMIT 1
        ");
        $stmt->execute([$snippetId]);
        return $stmt->fetch();
    }
}