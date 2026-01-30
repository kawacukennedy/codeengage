<?php

namespace App\Helpers;

use Exception;

class SecurityHelper
{
    /**
     * Generate a JWT token
     */
    public static function generateJwtToken(array $payload, string $secret): string
    {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        
        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    /**
     * Validate a JWT token
     */
    public static function validateJwtToken(string $token, string $secret): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;

        // Verify signature
        $signature = base64_decode(strtr($signatureEncoded, '-_', '+/'));
        $expectedSignature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $secret, true);
        
        if (!hash_equals($signature, $expectedSignature)) {
            return null;
        }

        // Decode payload
        $payload = json_decode(base64_decode(strtr($payloadEncoded, '-_', '+/')), true);
        
        // Check expiration
        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    /**
     * Generate a random string (safe for URL)
     */
    public static function generateRandomString(int $length = 32): string
    {
        return bin2hex(random_bytes($length / 2));
    }

    /**
     * Sanitize input array recursively
     */
    public static function sanitize(array $input): array
    {
        $sanitized = [];
        foreach ($input as $key => $value) {
            if (is_array($value)) {
                $sanitized[$key] = self::sanitize($value);
            } else {
                $sanitized[$key] = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
            }
        }
        return $sanitized;
    }

    /**
     * Check content for potential malware signatures
     */
    public static function scanForMalware(string $content): bool
    {
        // Signatures of common PHP web shells and malicious patterns
        $signatures = [
            'eval(base64_decode',
            'shell_exec(',
            'passthru(',
            'system(',
            'proc_open(',
            'pcntl_exec(',
            'assert(',
            'preg_replace(\'/e\''
        ];

        foreach ($signatures as $sig) {
            if (stripos($content, $sig) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Hash IP for reputation tracking (privacy-preserving)
     */
    public static function hashIp(string $ip): string
    {
        return hash('sha256', $ip . ($_ENV['APP_KEY'] ?? 'default_salt'));
    }

    /**
     * Generate CSRF Token
     */
    public static function generateCsrfToken(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    /**
     * Validate CSRF Token
     */
    public static function validateCsrfToken(string $token): bool
    {
        if (empty($_SESSION['csrf_token'])) {
            return false;
        }
        return hash_equals($_SESSION['csrf_token'], $token);
    }
}