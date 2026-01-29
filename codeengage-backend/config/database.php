<?php

return [
    'default' => $_ENV['DB_CONNECTION'] ?? 'mysql',

    'host' => getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? '127.0.0.1'),
    'port' => getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? '3306'),
    'name' => getenv('DB_DATABASE') ?: ($_ENV['DB_DATABASE'] ?? 'codeengage'),
    'user' => getenv('DB_USERNAME') ?: ($_ENV['DB_USERNAME'] ?? 'root'),
    'pass' => getenv('DB_PASSWORD') ?: ($_ENV['DB_PASSWORD'] ?? ''),
    'charset' => 'utf8mb4',
    
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ],
    
    // SQLite Configuration
    'sqlite_path' => __DIR__ . '/../storage/database.sqlite',
];