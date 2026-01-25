<?php

return [
    'driver' => $_ENV['SESSION_DRIVER'] ?? 'file',
    'lifetime' => (int)($_ENV['SESSION_LIFETIME'] ?? 7200),
    'path' => __DIR__ . '/../storage/sessions',
    'cookie' => [
        'name' => 'codeengage_session',
        'secure' => ($_ENV['SESSION_SECURE'] ?? 'false') === 'true',
        'httponly' => true,
        'samesite' => 'Lax',
    ],
    'jwt' => [
        'secret' => $_ENV['JWT_SECRET'] ?? 'default-secret-change-in-production',
        'algorithm' => 'HS256',
        'ttl' => 3600,
        'refresh_ttl' => 86400,
    ]
];