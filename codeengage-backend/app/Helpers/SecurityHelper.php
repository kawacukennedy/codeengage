<?php

namespace App\Helpers;

class SecurityHelper
{
    public static function generateCsrfToken(): string
    {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        
        return $_SESSION['csrf_token'];
    }

    public static function validateCsrfToken(string $token): bool
    {
        return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }

    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3,
        ]);
    }

    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    public static function generateSecureToken(int $length = 32): string
    {
        return bin2hex(random_bytes($length));
    }

    public static function sanitizeFileName(string $fileName): string
    {
        $fileName = preg_replace('/[^a-zA-Z0-9._-]/', '', $fileName);
        return substr($fileName, 0, 255);
    }

    public static function isValidMimeType(string $mimeType): bool
    {
        $allowedMimes = [
            'text/plain',
            'text/html',
            'text/css',
            'text/javascript',
            'application/javascript',
            'application/json',
            'application/xml',
            'text/xml',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
        ];
        
        return in_array($mimeType, $allowedMimes);
    }

    public static function escapeHtml(string $string): string
    {
        return htmlspecialchars($string, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function escapeJson(string $string): string
    {
        return json_encode($string, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    }

    public static function getIpAddress(): string
    {
        $headers = [
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'HTTP_CF_CONNECTING_IP',
            'REMOTE_ADDR'
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
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    public static function rateLimitCheck(string $key, int $limit, int $window): bool
    {
        if (function_exists('apcu_fetch')) {
            $cacheKey = "rate_limit:{$key}";
            $current = \apcu_fetch($cacheKey) ?: 0;
            
            if ($current >= $limit) {
                return false;
            }
            
            \apcu_store($cacheKey, $current + 1, $window);
            return true;
        }
        
        // Fallback to file-based rate limiting
        $cacheDir = sys_get_temp_dir() . '/codeengage_rate_limit';
        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }
        
        $cacheFile = $cacheDir . '/' . md5($key);
        $current = 0;
        
        if (file_exists($cacheFile)) {
            $data = unserialize(file_get_contents($cacheFile));
            if ($data['expires'] > time()) {
                $current = $data['count'];
            }
        }
        
        if ($current >= $limit) {
            return false;
        }
        
        file_put_contents($cacheFile, serialize([
            'count' => $current + 1,
            'expires' => time() + $window
        ]));
        
        return true;
    }
}