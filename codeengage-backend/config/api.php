<?php

return [
    'cors' => [
        'allowed_origins' => explode(',', $_ENV['CORS_ALLOWED_ORIGINS'] ?? '*'),
        'allowed_methods' => explode(',', $_ENV['CORS_ALLOWED_METHODS'] ?? 'GET,POST,PUT,DELETE,OPTIONS'),
        'allowed_headers' => explode(',', $_ENV['CORS_ALLOWED_HEADERS'] ?? 'Content-Type,Authorization,X-Requested-With'),
        'exposed_headers' => [],
        'max_age' => 86400,
        'supports_credentials' => true,
    ],
    'rate_limit' => [
        'default' => [
            'limit' => 100,
            'window' => 60, // per minute
        ],
        'auth' => [
            'limit' => 5,
            'window' => 900, // 15 minutes
        ],
        'api' => [
            'limit' => 1000,
            'window' => 3600, // per hour
        ],
    ],
    'version' => 'v1',
    'prefix' => '/api',
];