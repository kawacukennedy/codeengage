<?php

namespace App\Middleware;

class SecurityHeadersMiddleware
{
    public function handle()
    {
        // Prevent clickjacking
        header('X-Frame-Options: SAMEORIGIN');
        
        // Prevent MIME type sniffing
        header('X-Content-Type-Options: nosniff');
        
        // Enable XSS filtering
        header('X-XSS-Protection: 1; mode=block');
        
        // Content Security Policy (Basic)
        header("Content-Security-Policy: default-src 'self' https: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data:; font-src 'self' https: data:; object-src 'none'; frame-ancestors 'self'");
        
        // HSTS (if HTTPS)
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
        
        // Referrer Policy
        header('Referrer-Policy: strict-origin-when-cross-origin');
    }
}
