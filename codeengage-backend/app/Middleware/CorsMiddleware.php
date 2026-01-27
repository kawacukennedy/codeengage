<?php

namespace App\Middleware;

use App\Helpers\SecurityHelper;
use App\Helpers\ApiResponse;
use App\Repositories\UserRepository;

class CorsMiddleware
{
    private array $allowedOrigins;
    private array $allowedMethods;
    private array $allowedHeaders;
    private bool $allowCredentials;

    public function __construct(array $config = [])
    {
        $this->allowedOrigins = $config['allowed_origins'] ?? ['*'];
        $this->allowedMethods = $config['allowed_methods'] ?? ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
        $this->allowedHeaders = $config['allowed_headers'] ?? ['Content-Type', 'Authorization', 'X-Requested-With'];
        $this->allowCredentials = $config['allow_credentials'] ?? false;
    }

    public function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $method = $_SERVER['REQUEST_METHOD'] ?? '';

        // Handle preflight requests
        if ($method === 'OPTIONS') {
            $this->handlePreflight($origin);
            exit;
        }

        // Set CORS headers for actual requests
        $this->setCorsHeaders($origin);
    }

    private function handlePreflight(string $origin): void
    {
        if ($this->isOriginAllowed($origin)) {
            header('Access-Control-Allow-Origin: ' . ($this->allowedOrigins[0] === '*' ? '*' : $origin));
            header('Access-Control-Allow-Methods: ' . implode(', ', $this->allowedMethods));
            header('Access-Control-Allow-Headers: ' . implode(', ', $this->allowedHeaders));
            
            if ($this->allowCredentials) {
                header('Access-Control-Allow-Credentials: true');
            }
            
            header('Access-Control-Max-Age: 86400'); // 24 hours
            http_response_code(200);
        } else {
            http_response_code(403);
        }
    }

    private function setCorsHeaders(string $origin): void
    {
        if ($this->isOriginAllowed($origin)) {
            header('Access-Control-Allow-Origin: ' . ($this->allowedOrigins[0] === '*' ? '*' : $origin));
            
            if ($this->allowCredentials) {
                header('Access-Control-Allow-Credentials: true');
            }
            
            header('Access-Control-Expose-Headers: Content-Length, Content-Type');
        }
    }

    private function isOriginAllowed(string $origin): bool
    {
        if (in_array('*', $this->allowedOrigins)) {
            return true;
        }

        return in_array($origin, $this->allowedOrigins);
    }
}