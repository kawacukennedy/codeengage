<?php

namespace App\Models;

use PDO;

class User
{
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(array $data)
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO users (username, email, password_hash, display_name, created_at)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['username'],
            $data['email'],
            $data['password_hash'],
            $data['display_name'] ?? $data['username'],
            date('Y-m-d H:i:s')
        ]);
        
        return $this->pdo->lastInsertId();
    }

    public function findByEmail($email)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch();
    }
    
    public function findById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
}