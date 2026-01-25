<?php

// Database configuration for CodeEngage
return [
    'host' => 'localhost',
    'name' => 'codeengage_test',
    'user' => 'codeengage_user',
    'password' => 'test_password',
    'charset' => 'utf8mb4',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]
];
?>