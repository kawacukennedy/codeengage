<?php

namespace App\Middleware;

use App\Helpers\SecurityHelper;
use App\Helpers\ApiResponse;

class CsrfMiddleware
{
    private bool $enabled;
    private array $exemptMethods;
    private array $exemptRoutes;

    public function __construct(array $config = [])
    {
        $this->enabled = $config['enabled'] ?? true;
        $this->exemptMethods = $config['exempt_methods'] ?? ['GET', 'HEAD', 'OPTIONS'];
        $this->exemptRoutes = $config['exempt_routes'] ?? ['/api/auth/login', '/api/auth/register', '/auth/login', '/auth/register'];
    }

    public function handle(): void
    {
        if (!$this->enabled) {
            return;
        }

        $method = $_SERVER['REQUEST_METHOD'] ?? '';
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        // Exempt certain methods and routes
        if (in_array($method, $this->exemptMethods) || $this->isRouteExempt($uri)) {
            // Ensure cookie is set for valid sessions to allow subsequent non-safe requests
            $this->setTokenCookie();
            return;
        }

        // Check for CSRF token
        $token = $this->getCsrfToken();

        if (!$token) {
            ApiResponse::error('CSRF token missing', 403);
        }

        if (!SecurityHelper::validateCsrfToken($token)) {
            ApiResponse::error('Invalid CSRF token', 403);
        }

        // Regenerate token for additional security
        $this->regenerateToken();
    }

    private function getCsrfToken(): ?string
    {
        // Check headers first
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_SERVER['HTTP_X_XSRF_TOKEN'] ?? null;
        
        if ($token) {
            return $token;
        }

        // Check POST data
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            return $_POST['csrf_token'] ?? $_POST['_token'] ?? null;
        }

        // Check JSON payload
        if ($_SERVER['CONTENT_TYPE'] === 'application/json') {
            $input = json_decode(file_get_contents('php://input'), true);
            return $input['csrf_token'] ?? $input['_token'] ?? null;
        }

        return null;
    }

    private function isRouteExempt(string $uri): bool
    {
        foreach ($this->exemptRoutes as $route) {
            if (strpos($uri, $route) === 0) {
                return true;
            }
        }
        return false;
    }

    private function regenerateToken(): void
    {
        // Only regenerate token if it's old (to prevent race conditions)
        if (isset($_SESSION['csrf_token_time']) && 
            (time() - $_SESSION['csrf_token_time']) > 3600) {
            SecurityHelper::generateCsrfToken();
        }
    }

    public function generateToken(): string
    {
        return SecurityHelper::generateCsrfToken();
    }

    public function setTokenCookie(): void
    {
        if (!headers_sent()) {
            $token = SecurityHelper::generateCsrfToken();
            setcookie('XSRF-TOKEN', $token, [
                'expires' => 0,
                'path' => '/',
                'domain' => '',
                'secure' => true,
                'httponly' => false,
                'samesite' => 'Lax'
            ]);
        }
    }
}