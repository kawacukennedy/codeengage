<?php

return [
    'name' => $_ENV['APP_NAME'] ?? 'CodeEngage',
    'env' => $_ENV['APP_ENV'] ?? 'production',
    'debug' => ($_ENV['APP_DEBUG'] ?? 'false') === 'true',
    'url' => $_ENV['APP_URL'] ?? 'http://127.0.0.1',
    'timezone' => 'UTC',
    'locale' => 'en',
    
    'auth' => [
        'method' => 'jwt',
        'jwt' => [
            'secret' => $_ENV['JWT_SECRET'] ?? 'default-secret-change-in-production',
            'algo' => 'HS256'
        ],
        'session_lifetime' => $_ENV['SESSION_LIFETIME'] ?? 120,
    ]
];