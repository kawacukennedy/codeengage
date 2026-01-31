<?php

namespace App\Services;

use App\Helpers\Logger;
use PDO;

/**
 * Security Event Logging Service
 */
class SecurityEventService
{
    private Logger $logger;
    private PDO $db;
    private array $config;
    private array $eventTypes = [
        'login_attempt',
        'login_success',
        'login_failure', 
        'logout',
        'password_reset_request',
        'password_reset_success',
        'password_reset_failure',
        'account_lockout',
        'suspicious_activity',
        'brute_force_detected',
        'rate_limit_exceeded',
        'unauthorized_access',
        'privilege_escalation_attempt',
        'data_access_attempt',
        'session_hijacking_attempt',
        'xss_attempt',
        'sql_injection_attempt',
        'csrf_attempt',
        'file_upload_attempt',
        'admin_access',
        'api_key_usage',
        'permission_denied',
        'malicious_request',
        'bot_detected',
        'geo_anomaly',
        'device_anomaly',
        'time_anomaly'
    ];

    private array $severityLevels = [
        'info',      // Normal operations like login success, logout
        'warning',   // Suspicious but potentially legitimate activities
        'error',     // Clear security violations or attacks
        'critical'   // Severe threats requiring immediate attention
    ];

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->logger = new Logger();
        $this->config = require __DIR__ . '/../../config/app.php';
    }

    /**
     * Log a security event
     */
    public function logEvent(string $eventType, array $context = [], string $severity = 'info'): void
    {
        if (!in_array($eventType, $this->eventTypes)) {
            $eventType = 'suspicious_activity';
        }

        if (!in_array($severity, $this->severityLevels)) {
            $severity = 'info';
        }

        $event = [
            'event_type' => $eventType,
            'severity' => $severity,
            'timestamp' => date('Y-m-d H:i:s'),
            'request_id' => $_SERVER['REQUEST_ID'] ?? uniqid('sec_', true),
            'client_ip' => $this->getClientIp(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'user_id' => $context['user_id'] ?? null,
            'username' => $context['username'] ?? null,
            'email' => $context['email'] ?? null,
            'session_id' => session_id() ?? null,
            'endpoint' => $context['endpoint'] ?? $_SERVER['REQUEST_URI'] ?? null,
            'method' => $_SERVER['REQUEST_METHOD'] ?? null,
            'details' => $context['details'] ?? [],
            'geo_data' => $this->getGeoData($this->getClientIp()),
            'device_fingerprint' => $this->getDeviceFingerprint(),
            'risk_score' => $this->calculateRiskScore($eventType, $context)
        ];

        // Log to file
        $this->logToFile($event);

        // Store in database
        $this->storeInDatabase($event);

        // Check for automatic responses
        $this->handleSecurityEvent($event);
    }

    /**
     * Log login attempt
     */
    public function logLoginAttempt(string $email, string $ip = null, array $context = []): void
    {
        $this->logEvent('login_attempt', array_merge([
            'email' => $email,
            'ip_override' => $ip,
            'login_method' => $context['method'] ?? 'password',
            'remember_me' => $context['remember_me'] ?? false,
            'endpoint' => '/api/auth/login',
            'method' => 'POST'
        ], $context), 'info');
    }

    /**
     * Log successful login
     */
    public function logLoginSuccess(string $userId, string $email, array $context = []): void
    {
        $this->logEvent('login_success', array_merge([
            'user_id' => $userId,
            'email' => $email,
            'login_method' => $context['method'] ?? 'password',
            'remember_me' => $context['remember_me'] ?? false,
            'mfa_verified' => $context['mfa_verified'] ?? false,
            'endpoint' => '/api/auth/login',
            'method' => 'POST'
        ], $context), 'info');
    }

    /**
     * Log failed login
     */
    public function logLoginFailure(string $email, string $reason, array $context = []): void
    {
        $this->logEvent('login_failure', array_merge([
            'email' => $email,
            'failure_reason' => $reason,
            'login_method' => $context['method'] ?? 'password',
            'endpoint' => '/api/auth/login',
            'method' => 'POST'
        ], $context), 'warning');
    }

    /**
     * Log account lockout
     */
    public function logAccountLockout(string $email, int $attempts, int $lockoutDuration, array $context = []): void
    {
        $this->logEvent('account_lockout', array_merge([
            'email' => $email,
            'failed_attempts' => $attempts,
            'lockout_duration_minutes' => $lockoutDuration,
            'lockout_reason' => $context['reason'] ?? 'too_many_failed_attempts',
            'endpoint' => '/api/auth/login',
            'method' => 'POST'
        ], $context), 'error');
    }

    /**
     * Log brute force detection
     */
    public function logBruteForceDetection(string $ip, string $target, int $attempts, int $timeWindow, array $context = []): void
    {
        $this->logEvent('brute_force_detected', array_merge([
            'target' => $target, // email, username, or endpoint
            'attack_ip' => $ip,
            'attempts_in_window' => $attempts,
            'time_window_minutes' => $timeWindow,
            'patterns_detected' => $context['patterns'] ?? [],
            'blocked' => $context['blocked'] ?? false
        ], $context), 'error');
    }

    /**
     * Log rate limit exceeded
     */
    public function logRateLimitExceeded(string $ip, string $endpoint, int $limit, int $window, array $context = []): void
    {
        $this->logEvent('rate_limit_exceeded', array_merge([
            'rate_limited_ip' => $ip,
            'endpoint' => $endpoint,
            'limit' => $limit,
            'window_minutes' => $window,
            'current_count' => $context['current_count'] ?? 0,
            'method' => $_SERVER['REQUEST_METHOD'] ?? null
        ], $context), 'warning');
    }

    /**
     * Log unauthorized access attempt
     */
    public function logUnauthorizedAccess(string $endpoint, string $method, array $context = []): void
    {
        $this->logEvent('unauthorized_access', array_merge([
            'endpoint' => $endpoint,
            'method' => $method,
            'auth_type_required' => $context['auth_type'] ?? 'bearer_token',
            'authorization_header' => $context['authorization_header'] ?? false,
            'session_valid' => $context['session_valid'] ?? false,
            'token_valid' => $context['token_valid'] ?? false
        ], $context), 'warning');
    }

    /**
     * Log privilege escalation attempt
     */
    public function logPrivilegeEscalationAttempt(string $userId, string $targetRole, array $context = []): void
    {
        $this->logEvent('privilege_escalation_attempt', array_merge([
            'user_id' => $userId,
            'target_role' => $targetRole,
            'current_role' => $context['current_role'] ?? null,
            'method_attempted' => $context['method'] ?? 'direct_request',
            'endpoint' => $context['endpoint'] ?? $_SERVER['REQUEST_URI'] ?? null
        ], $context), 'error');
    }

    /**
     * Log XSS attempt
     */
    public function logXssAttempt(string $input, string $context, array $details = []): void
    {
        $this->logEvent('xss_attempt', array_merge([
            'malicious_input' => $input,
            'context' => $context, // parameter name, header, etc.
            'attack_patterns' => $details['patterns'] ?? [],
            'sanitized_successfully' => $details['sanitized'] ?? false,
            'endpoint' => $_SERVER['REQUEST_URI'] ?? null,
            'method' => $_SERVER['REQUEST_METHOD'] ?? null
        ], $details), 'error');
    }

    /**
     * Log SQL injection attempt
     */
    public function logSqlInjectionAttempt(string $query, string $context, array $details = []): void
    {
        $this->logEvent('sql_injection_attempt', array_merge([
            'malicious_query' => $query,
            'context' => $context,
            'attack_patterns' => $details['patterns'] ?? [],
            'blocked_successfully' => $details['blocked'] ?? false,
            'endpoint' => $_SERVER['REQUEST_URI'] ?? null,
            'method' => $_SERVER['REQUEST_METHOD'] ?? null
        ], $details), 'critical');
    }

    /**
     * Log suspicious activity
     */
    public function logSuspiciousActivity(string $description, array $context = []): void
    {
        $this->logEvent('suspicious_activity', array_merge([
            'description' => $description,
            'anomaly_type' => $context['anomaly_type'] ?? 'unusual_behavior',
            'risk_indicators' => $context['risk_indicators'] ?? [],
            'endpoint' => $_SERVER['REQUEST_URI'] ?? null,
            'method' => $_SERVER['REQUEST_METHOD'] ?? null
        ], $context), 'warning');
    }

    /**
     * Check for suspicious patterns in request
     */
    public function analyzeRequest(): array
    {
        $risks = [];
        
        // Check for common attack patterns
        $uri = $_SERVER['REQUEST_URI'] ?? '';
        $method = $_SERVER['REQUEST_METHOD'] ?? '';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $headers = getallheaders();

        // SQL injection patterns
        $sqlPatterns = [
            '/(\%27)|(\')|(\-\-)|(\%23)|(#)/i',
            '/((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i',
            '/\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i',
            '/((\%27)|(\'))union/ix',
            '/exec(\s|\+)+(s|x)p\w+/ix',
            '/UNION[^a-zA-Z]/i',
            '/SELECT.*FROM.*((\%27)|(\'))/i'
        ];

        foreach ($sqlPatterns as $pattern) {
            if (preg_match($pattern, $uri) || preg_match($pattern, json_encode($_POST))) {
                $risks[] = [
                    'type' => 'sql_injection_attempt',
                    'severity' => 'critical',
                    'pattern' => $pattern,
                    'detected_in' => 'uri_or_parameters'
                ];
            }
        }

        // XSS patterns
        $xssPatterns = [
            '/<script[^>]*>.*?<\/script>/i',
            '/<iframe[^>]*>.*?<\/iframe>/i',
            '/javascript:/i',
            '/on\w+\s*=/i',
            '/<img.*src\s*=/i'
        ];

        foreach ($xssPatterns as $pattern) {
            if (preg_match($pattern, $uri) || preg_match($pattern, json_encode($_POST))) {
                $risks[] = [
                    'type' => 'xss_attempt',
                    'severity' => 'error',
                    'pattern' => $pattern,
                    'detected_in' => 'uri_or_parameters'
                ];
            }
        }

        // Path traversal patterns
        $pathPatterns = [
            '/\.\.\//',
            '/\%2e%2e%2f/',
            '/\.\.\\/',
            '/\%2e%2e%5c/'
        ];

        foreach ($pathPatterns as $pattern) {
            if (preg_match($pattern, $uri)) {
                $risks[] = [
                    'type' => 'path_traversal_attempt',
                    'severity' => 'error',
                    'pattern' => $pattern,
                    'detected_in' => 'uri'
                ];
            }
        }

        // Bot detection
        if ($this->isBot($userAgent)) {
            $risks[] = [
                'type' => 'bot_detected',
                'severity' => 'info',
                'pattern' => 'user_agent_analysis',
                'user_agent' => $userAgent
            ];
        }

        // Log any detected risks
        foreach ($risks as $risk) {
            $this->logEvent($risk['type'], [
                'severity' => $risk['severity'],
                'pattern' => $risk['pattern'],
                'detected_in' => $risk['detected_in'],
                'user_agent' => $userAgent,
                'endpoint' => $uri,
                'method' => $method,
                'risk_indicators' => [$risk]
            ], $risk['severity']);
        }

        return $risks;
    }

    /**
     * Handle security event with automatic responses
     */
    private function handleSecurityEvent(array $event): void
    {
        $eventType = $event['event_type'];
        $severity = $event['severity'];
        $riskScore = $event['risk_score'];

        // Critical events require immediate action
        if ($severity === 'critical' || $riskScore >= 80) {
            $this->handleCriticalSecurityEvent($event);
        }

        // High severity events
        if ($severity === 'error' || $riskScore >= 60) {
            $this->handleHighSecurityEvent($event);
        }

        // Specific event handlers
        switch ($eventType) {
            case 'brute_force_detected':
                $this->handleBruteForce($event);
                break;
            case 'account_lockout':
                $this->handleAccountLockout($event);
                break;
            case 'rate_limit_exceeded':
                $this->handleRateLimit($event);
                break;
        }
    }

    /**
     * Handle critical security events
     */
    private function handleCriticalSecurityEvent(array $event): void
    {
        // Log to separate security log
        $this->logger->log('CRITICAL SECURITY EVENT', 'CRITICAL', $event);

        // Could integrate with external security systems here
        // - Send alerts to security team
        // - Block IP addresses
        // - Trigger incident response
        
        if ($this->config['security']['auto_block_ips'] ?? false) {
            $this->blockIp($event['client_ip'], $event['event_type']);
        }
    }

    /**
     * Handle high severity security events
     */
    private function handleHighSecurityEvent(array $event): void
    {
        // Additional monitoring for high severity events
        $this->logger->log('HIGH SEVERITY SECURITY EVENT', 'ERROR', $event);
    }

    /**
     * Handle brute force attacks
     */
    private function handleBruteForce(array $event): void
    {
        $ip = $event['client_ip'];
        
        // Log additional context
        $this->logger->log('Brute force attack detected', 'ERROR', [
            'ip' => $ip,
            'target' => $event['target'],
            'attempts' => $event['details']['attempts_in_window'] ?? 0,
            'action_taken' => 'monitoring_for_auto_block'
        ]);
    }

    /**
     * Handle account lockouts
     */
    private function handleAccountLockout(array $event): void
    {
        $email = $event['email'];
        $duration = $event['details']['lockout_duration_minutes'] ?? 15;

        $this->logger->log('Account locked due to failed attempts', 'WARNING', [
            'email' => $email,
            'duration_minutes' => $duration,
            'reason' => $event['details']['lockout_reason'] ?? 'unknown'
        ]);
    }

    /**
     * Handle rate limiting
     */
    private function handleRateLimit(array $event): void
    {
        $this->logger->log('Rate limit exceeded', 'WARNING', [
            'ip' => $event['client_ip'],
            'endpoint' => $event['endpoint'],
            'limit' => $event['limit'],
            'current_count' => $event['details']['current_count'] ?? 0
        ]);
    }

    /**
     * Log event to file
     */
    private function logToFile(array $event): void
    {
        $logDir = __DIR__ . '/../../logs/security';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }

        $logFile = $logDir . '/security.json';
        file_put_contents($logFile, json_encode($event) . PHP_EOL, FILE_APPEND);
    }

    /**
     * Store event in database
     */
    private function storeInDatabase(array $event): void
    {
        if (!($this->config['security']['log_to_database'] ?? true)) {
            return;
        }

        try {
            // Create security_events table if it doesn't exist
            $this->createSecurityEventsTable();

            $stmt = $this->db->prepare("
                INSERT INTO security_events (
                    event_type, severity, timestamp, request_id, client_ip,
                    user_agent, user_id, username, email, session_id,
                    endpoint, method, details, geo_data, risk_score
                ) VALUES (
                    :event_type, :severity, :timestamp, :request_id, :client_ip,
                    :user_agent, :user_id, :username, :email, :session_id,
                    :endpoint, :method, :details, :geo_data, :risk_score
                )
            ");

            $stmt->execute([
                ':event_type' => $event['event_type'],
                ':severity' => $event['severity'],
                ':timestamp' => $event['timestamp'],
                ':request_id' => $event['request_id'],
                ':client_ip' => $event['client_ip'],
                ':user_agent' => $event['user_agent'],
                ':user_id' => $event['user_id'],
                ':username' => $event['username'],
                ':email' => $event['email'],
                ':session_id' => $event['session_id'],
                ':endpoint' => $event['endpoint'],
                ':method' => $event['method'],
                ':details' => json_encode($event['details']),
                ':geo_data' => json_encode($event['geo_data']),
                ':risk_score' => $event['risk_score']
            ]);

        } catch (\Exception $e) {
            $this->logger->log('Failed to store security event in database', 'ERROR', [
                'error' => $e->getMessage(),
                'event_id' => $event['request_id']
            ]);
        }
    }

    /**
     * Create security_events table
     */
    private function createSecurityEventsTable(): void
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS security_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL,
                severity ENUM('info', 'warning', 'error', 'critical') NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                request_id VARCHAR(64),
                client_ip VARCHAR(45),
                user_agent TEXT,
                user_id INT,
                username VARCHAR(100),
                email VARCHAR(255),
                session_id VARCHAR(255),
                endpoint VARCHAR(500),
                method VARCHAR(10),
                details JSON,
                geo_data JSON,
                risk_score INT DEFAULT 0,
                INDEX idx_event_type (event_type),
                INDEX idx_severity (severity),
                INDEX idx_timestamp (timestamp),
                INDEX idx_client_ip (client_ip),
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";

        $this->db->exec($sql);
    }

    /**
     * Calculate risk score for event
     */
    private function calculateRiskScore(string $eventType, array $context): int
    {
        $baseScores = [
            'login_attempt' => 10,
            'login_success' => 0,
            'login_failure' => 20,
            'account_lockout' => 60,
            'brute_force_detected' => 80,
            'rate_limit_exceeded' => 40,
            'unauthorized_access' => 50,
            'privilege_escalation_attempt' => 90,
            'xss_attempt' => 85,
            'sql_injection_attempt' => 95,
            'suspicious_activity' => 30
        ];

        $baseScore = $baseScores[$eventType] ?? 30;

        // Adjust based on context
        if (!empty($context['previous_failures'])) {
            $baseScore += $context['previous_failures'] * 5;
        }

        if (!empty($context['from_suspicious_ip'])) {
            $baseScore += 20;
        }

        if (!empty($context['unusual_user_agent'])) {
            $baseScore += 10;
        }

        return min(100, max(0, $baseScore));
    }

    /**
     * Get client IP with proxy detection
     */
    private function getClientIp(): string
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
     * Get geographic data for IP
     */
    private function getGeoData(string $ip): array
    {
        // This would integrate with a GeoIP service
        // For now, return basic info
        return [
            'country' => null,
            'city' => null,
            'latitude' => null,
            'longitude' => null,
            'isp' => null,
            'is_proxy' => $this->isProxyIp($ip),
            'is_tor' => $this->isTorIp($ip)
        ];
    }

    /**
     * Get device fingerprint
     */
    private function getDeviceFingerprint(): array
    {
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        
        return [
            'user_agent_hash' => md5($userAgent),
            'browser' => $this->extractBrowser($userAgent),
            'os' => $this->extractOs($userAgent),
            'is_mobile' => $this->isMobile($userAgent),
            'screen_resolution' => $_COOKIE['screen_resolution'] ?? null,
            'timezone' => $_COOKIE['timezone'] ?? null,
            'language' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? null
        ];
    }

    /**
     * Check if IP is from proxy
     */
    private function isProxyIp(string $ip): bool
    {
        // This would integrate with proxy detection service
        return false;
    }

    /**
     * Check if IP is from Tor network
     */
    private function isTorIp(string $ip): bool
    {
        // This would integrate with Tor exit node lists
        return false;
    }

    /**
     * Check if user agent indicates bot
     */
    private function isBot(string $userAgent): bool
    {
        $botPatterns = [
            'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
            'python', 'java', 'perl', 'ruby', 'node', 'go-http'
        ];

        foreach ($botPatterns as $pattern) {
            if (stripos($userAgent, $pattern) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract browser from user agent
     */
    private function extractBrowser(string $userAgent): string
    {
        if (preg_match('/Chrome\/[\d.]+/', $userAgent)) return 'Chrome';
        if (preg_match('/Firefox\/[\d.]+/', $userAgent)) return 'Firefox';
        if (preg_match('/Safari\/[\d.]+/', $userAgent)) return 'Safari';
        if (preg_match('/Edge\/[\d.]+/', $userAgent)) return 'Edge';
        if (preg_match('/OPR\/[\d.]+/', $userAgent)) return 'Opera';
        
        return 'Unknown';
    }

    /**
     * Extract OS from user agent
     */
    private function extractOs(string $userAgent): string
    {
        if (preg_match('/Windows NT [\d.]+/', $userAgent)) return 'Windows';
        if (preg_match('/Mac OS X [\d._]+/', $userAgent)) return 'macOS';
        if (preg_match('/Linux/', $userAgent)) return 'Linux';
        if (preg_match('/Android/', $userAgent)) return 'Android';
        if (preg_match('/iOS/', $userAgent)) return 'iOS';
        
        return 'Unknown';
    }

    /**
     * Check if user agent indicates mobile
     */
    private function isMobile(string $userAgent): bool
    {
        $mobilePatterns = ['Mobile', 'Android', 'iPhone', 'iPad', 'iPod', 'BlackBerry'];
        
        foreach ($mobilePatterns as $pattern) {
            if (stripos($userAgent, $pattern) !== false) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Block IP address
     */
    private function blockIp(string $ip, string $reason): void
    {
        // This would implement IP blocking mechanism
        $this->logger->log("IP blocked: {$reason}", 'WARNING', [
            'ip' => $ip,
            'reason' => $reason,
            'blocked_at' => date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Get security statistics
     */
    public function getSecurityStats(string $period = '24h'): array
    {
        try {
            $whereClause = '';
            
            switch ($period) {
                case '1h':
                    $whereClause = "WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)";
                    break;
                case '24h':
                    $whereClause = "WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)";
                    break;
                case '7d':
                    $whereClause = "WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
                    break;
                case '30d':
                    $whereClause = "WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
                    break;
            }

            $stmt = $this->db->query("
                SELECT 
                    event_type,
                    severity,
                    COUNT(*) as count,
                    COUNT(DISTINCT client_ip) as unique_ips,
                    COUNT(DISTINCT user_id) as unique_users
                FROM security_events 
                {$whereClause}
                GROUP BY event_type, severity
                ORDER BY count DESC
            ");

            $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get top risk IPs
            $ipStmt = $this->db->query("
                SELECT 
                    client_ip,
                    COUNT(*) as event_count,
                    AVG(risk_score) as avg_risk_score
                FROM security_events 
                {$whereClause}
                GROUP BY client_ip 
                HAVING event_count > 1
                ORDER BY event_count DESC 
                LIMIT 10
            ");

            $topIps = $ipStmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'event_stats' => $stats,
                'top_suspicious_ips' => $topIps,
                'period' => $period,
                'generated_at' => date('Y-m-d H:i:s')
            ];

        } catch (\Exception $e) {
            $this->logger->log('Failed to get security stats', 'ERROR', [
                'error' => $e->getMessage()
            ]);

            return [
                'error' => 'Failed to retrieve statistics',
                'period' => $period
            ];
        }
    }
}