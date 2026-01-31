<?php

namespace App\Controllers\Api;

use PDO;
use App\Helpers\ApiResponse;
use App\Services\LoggerService;

abstract class BaseController
{
    protected PDO $db;
    protected LoggerService $logger;
    protected array $config;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->logger = new LoggerService();
        $this->config = require __DIR__ . '/../../../config/app.php';
    }

    /**
     * Handle method validation
     */
    protected function requireMethod(string $method, string $allowedMethod): void
    {
        if ($method !== $allowedMethod) {
            $this->handleException(new \Exception('Method not allowed'), [
                'required_method' => $allowedMethod,
                'provided_method' => $method,
                'error_type' => 'method_not_allowed'
            ], 405);
        }
    }

    /**
     * Handle GET requests
     */
    protected function requireGet(string $method): void
    {
        $this->requireMethod($method, 'GET');
    }

    /**
     * Handle POST requests
     */
    protected function requirePost(string $method): void
    {
        $this->requireMethod($method, 'POST');
    }

    /**
     * Handle PUT requests
     */
    protected function requirePut(string $method): void
    {
        $this->requireMethod($method, 'PUT');
    }

    /**
     * Handle DELETE requests
     */
    protected function requireDelete(string $method): void
    {
        $this->requireMethod($method, 'DELETE');
    }

    /**
     * Get and validate JSON input
     */
    protected function getJsonInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->handleException(new \Exception('Invalid JSON input: ' . json_last_error_msg()), [
                'error_type' => 'invalid_json',
                'json_error' => json_last_error()
            ], 400);
        }

        if (!is_array($input)) {
            $this->handleException(new \Exception('Request body must be JSON object'), [
                'error_type' => 'invalid_input_type',
                'expected' => 'object',
                'received' => gettype($input)
            ], 400);
        }

        return $input;
    }

    /**
     * Validate required fields
     */
    protected function requireFields(array $data, array $required): void
    {
        $missing = [];
        
        foreach ($required as $field) {
            if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
                $missing[] = $field;
            }
        }

        if (!empty($missing)) {
            $this->handleException(new \Exception('Missing required fields: ' . implode(', ', $missing)), [
                'error_type' => 'missing_fields',
                'missing_fields' => $missing,
                'required_fields' => $required
            ], 422);
        }
    }

    /**
     * Validate field types
     */
    protected function validateTypes(array $data, array $typeRules): void
    {
        $errors = [];

        foreach ($typeRules as $field => $expectedType) {
            if (!isset($data[$field])) {
                continue; // Skip missing fields (handled by requireFields)
            }

            $value = $data[$field];
            $actualType = gettype($value);

            // Normalize type names
            $typeMap = [
                'integer' => 'integer',
                'int' => 'integer',
                'string' => 'string',
                'str' => 'string',
                'boolean' => 'boolean',
                'bool' => 'boolean',
                'array' => 'array',
                'double' => 'double',
                'float' => 'double'
            ];

            $expectedType = $typeMap[$expectedType] ?? $expectedType;

            if ($actualType !== $expectedType) {
                // Special handling for numeric strings
                if ($expectedType === 'integer' && is_numeric($value)) {
                    continue;
                }

                $errors[$field] = "Expected type {$expectedType}, got {$actualType}";
            }
        }

        if (!empty($errors)) {
            $this->handleException(new \Exception('Invalid field types'), [
                'error_type' => 'invalid_types',
                'field_errors' => $errors,
                'type_rules' => $typeRules
            ], 422);
        }
    }

    /**
     * Get current authenticated user ID
     */
    protected function getCurrentUserId(): ?int
    {
        return $_SESSION['user_id'] ?? null;
    }

    /**
     * Require authentication
     */
    protected function requireAuth(): int
    {
        $userId = $this->getCurrentUserId();
        
        if (!$userId) {
            $this->handleException(new \Exception('Authentication required'), [
                'error_type' => 'authentication_required',
                'user_id' => null
            ], 401);
        }

        return $userId;
    }

    /**
     * Get request ID for tracking
     */
    protected function getRequestId(): string
    {
        return $_SERVER['HTTP_X_REQUEST_ID'] ?? uniqid('req_', true);
    }

    /**
     * Get client IP address
     */
    protected function getClientIp(): string
    {
        $headers = [
            'HTTP_CF_CONNECTING_IP',      // Cloudflare
            'HTTP_X_FORWARDED_FOR',       // Generic proxy
            'HTTP_X_REAL_IP',             // Nginx proxy
            'HTTP_CLIENT_IP',             // Apache
            'REMOTE_ADDR'                 // Fallback
        ];

        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ips = explode(',', $_SERVER[$header]);
                $ip = trim($ips[0]);
                
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }

        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    /**
     * Get user agent
     */
    protected function getUserAgent(): string
    {
        return $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    }

    /**
     * Standardized exception handling
     */
    protected function handleException(\Exception $e, array $context = [], int $statusCode = 500): void
    {
        $requestId = $this->getRequestId();
        $userId = $this->getCurrentUserId();

        // Log the error with context
        $this->logger->error('API Exception', [
            'message' => $e->getMessage(),
            'exception_class' => get_class($e),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
            'status_code' => $statusCode,
            'user_id' => $userId,
            'request_id' => $requestId,
            'client_ip' => $this->getClientIp(),
            'user_agent' => $this->getUserAgent(),
            'context' => $context
        ]);

        // Set response headers for debugging
        header('X-Request-ID: ' . $requestId);
        
        // Determine error code based on context
        $errorCode = $context['error_type'] ?? 'internal_error';
        
        // Prepare error response
        $errorResponse = [
            'success' => false,
            'message' => $this->getUserFriendlyMessage($e, $context),
            'error_code' => $errorCode,
            'request_id' => $requestId,
            'timestamp' => date('Y-m-d H:i:s')
        ];

        // Add details in debug mode or for validation errors
        if ($this->config['debug'] || $statusCode === 422) {
            $errorResponse['details'] = array_filter($context, function($key) {
                return in_array($key, ['missing_fields', 'field_errors', 'required_fields', 'type_rules']);
            }, ARRAY_FILTER_USE_KEY);
        }

        // Add validation errors if present
        if (isset($context['errors']) && is_array($context['errors'])) {
            $errorResponse['errors'] = $context['errors'];
        }

        // Send response
        http_response_code($statusCode);
        echo json_encode($errorResponse, JSON_PRETTY_PRINT);
        exit;
    }

    /**
     * Get user-friendly error message
     */
    private function getUserFriendlyMessage(\Exception $e, array $context): string
    {
        $errorType = $context['error_type'] ?? '';

        // Don't expose internal errors in production
        if (!$this->config['debug'] && $errorType === 'internal_error') {
            return 'An internal error occurred. Please try again later.';
        }

        // Map error types to user-friendly messages
        $messageMap = [
            'method_not_allowed' => 'HTTP method not allowed for this endpoint.',
            'invalid_json' => 'Invalid JSON format in request body.',
            'invalid_input_type' => 'Request body must be a valid JSON object.',
            'missing_fields' => 'Required information is missing from your request.',
            'invalid_types' => 'Some fields have invalid data types.',
            'authentication_required' => 'You must be logged in to perform this action.',
            'permission_denied' => 'You do not have permission to perform this action.',
            'resource_not_found' => 'The requested resource was not found.',
            'validation_failed' => 'Your input data is invalid.',
            'rate_limit_exceeded' => 'Too many requests. Please try again later.',
            'service_unavailable' => 'This service is currently unavailable. Please try again later.'
        ];

        return $messageMap[$errorType] ?? $e->getMessage();
    }

    /**
     * Validate input with common validation rules
     */
    protected function validateInput(array $data, array $rules): void
    {
        $errors = [];

        foreach ($rules as $field => $ruleSet) {
            if (!is_array($ruleSet)) {
                $ruleSet = [$ruleSet];
            }

            foreach ($ruleSet as $rule) {
                if (is_string($rule)) {
                    // Handle built-in validation rules
                    switch ($rule) {
                        case 'required':
                            if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
                                $errors[$field][] = 'This field is required';
                            }
                            break;

                        case 'email':
                            if (isset($data[$field]) && !filter_var($data[$field], FILTER_VALIDATE_EMAIL)) {
                                $errors[$field][] = 'Must be a valid email address';
                            }
                            break;

                        case 'url':
                            if (isset($data[$field]) && !filter_var($data[$field], FILTER_VALIDATE_URL)) {
                                $errors[$field][] = 'Must be a valid URL';
                            }
                            break;

                        case 'int':
                        case 'integer':
                            if (isset($data[$field]) && !is_numeric($data[$field])) {
                                $errors[$field][] = 'Must be a number';
                            }
                            break;

                        case 'string':
                            if (isset($data[$field]) && !is_string($data[$field])) {
                                $errors[$field][] = 'Must be a string';
                            }
                            break;

                        case 'array':
                            if (isset($data[$field]) && !is_array($data[$field])) {
                                $errors[$field][] = 'Must be an array';
                            }
                            break;
                    }
                } elseif (is_array($rule)) {
                    // Handle parameterized rules like min, max, regex
                    if (isset($rule['min']) && isset($data[$field]) && strlen($data[$field]) < $rule['min']) {
                        $errors[$field][] = "Must be at least {$rule['min']} characters";
                    }

                    if (isset($rule['max']) && isset($data[$field]) && strlen($data[$field]) > $rule['max']) {
                        $errors[$field][] = "Must be no more than {$rule['max']} characters";
                    }

                    if (isset($rule['regex']) && isset($data[$field]) && !preg_match($rule['regex'], $data[$field])) {
                        $errors[$field][] = $rule['message'] ?? 'Invalid format';
                    }
                }
            }
        }

        if (!empty($errors)) {
            $this->handleException(new \Exception('Validation failed'), [
                'error_type' => 'validation_failed',
                'errors' => $errors
            ], 422);
        }
    }

    /**
     * Set response headers for consistency
     */
    protected function setResponseHeaders(): void
    {
        header('X-Request-ID: ' . $this->getRequestId());
        header_remove('X-Powered-By');
    }
}