<?php

return [
    'name' => 'CodeEngage',
    'env' => $_ENV['APP_ENV'] ?? 'development',
    'debug' => ($_ENV['APP_DEBUG'] ?? 'true') === 'true',
    'url' => $_ENV['APP_URL'] ?? 'http://localhost',
    'timezone' => 'UTC',
    'locale' => 'en',
    'key' => $_ENV['APP_KEY'] ?? 'base64:' . base64_encode(random_bytes(32)),
];