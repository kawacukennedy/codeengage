<?php

namespace App\Helpers;

class Logger
{
    private static $logFile = __DIR__ . '/../../logs/app.json';

    public static function log($message, $level = 'INFO', $context = [])
    {
        $logDir = dirname(self::$logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }

        $entry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => $level,
            'message' => $message,
            'context' => $context,
            'request_id' => bin2hex(random_bytes(8)),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ];

        file_put_contents(self::$logFile, json_encode($entry) . PHP_EOL, FILE_APPEND);
    }

    public static function info($message, $context = []) { self::log($message, 'INFO', $context); }
    public static function error($message, $context = []) { self::log($message, 'ERROR', $context); }
    public static function warn($message, $context = []) { self::log($message, 'WARN', $context); }
    public static function debug($message, $context = []) { self::log($message, 'DEBUG', $context); }
}
