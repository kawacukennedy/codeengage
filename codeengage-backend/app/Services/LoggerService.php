<?php

namespace App\Services;

class LoggerService
{
    private static $logFile;

    public static function init()
    {
        if (!self::$logFile) {
            $logDir = __DIR__ . '/../../storage/logs';
            if (!file_exists($logDir)) {
                mkdir($logDir, 0777, true);
            }
            self::$logFile = $logDir . '/app-' . date('Y-m-d') . '.json.log';
        }
    }

    public static function log($level, $message, $context = [])
    {
        self::init();
        
        $entry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => strtoupper($level),
            'message' => $message,
            'context' => $context,
            'request_id' => $_SERVER['REQUEST_ID'] ?? uniqid(),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
        ];

        file_put_contents(self::$logFile, json_encode($entry) . PHP_EOL, FILE_APPEND);
    }

    public static function info($message, $context = [])
    {
        self::log('info', $message, $context);
    }

    public static function error($message, $context = [])
    {
        self::log('error', $message, $context);
    }

    public static function warning($message, $context = [])
    {
        self::log('warning', $message, $context);
    }
    
    public static function debug($message, $context = [])
    {
        // Only log debug in dev environment or if configured
        if (getenv('APP_DEBUG') === 'true') {
            self::log('debug', $message, $context);
        }
    }
}
