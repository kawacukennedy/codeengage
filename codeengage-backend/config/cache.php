<?php

return [
    'driver' => $_ENV['CACHE_DRIVER'] ?? 'file',
    'file' => [
        'path' => __DIR__ . '/../storage/cache',
    ],
    'redis' => [
        'host' => $_ENV['REDIS_HOST'] ?? '127.0.0.1',
        'port' => $_ENV['REDIS_PORT'] ?? 6379,
    ],
    'ttl' => [
        'default' => 3600,
        'api' => 300,
        'analysis' => 86400,
        'user' => 1800,
    ]
];