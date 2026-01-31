<?php

// Start latency tracking
$startTime = microtime(true);

// Generate or get request correlation ID
$requestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? uniqid('req_', true);
$_SERVER['REQUEST_ID'] = $requestId;
header('X-Request-ID: ' . $requestId);

// API Entry Point for CodeEngage
header_remove('X-Powered-By');

// Set default headers
header('Content-Type: application/json');

// Handle CORS
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, X-CSRF-TOKEN');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Start Session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Custom error handler
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

// Exception handler
set_exception_handler(function($exception) {
    http_response_code(500);
    
    if (($_ENV['APP_DEBUG'] ?? 'false') === 'true') {
        echo json_encode([
            'success' => false,
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTrace()
        ], JSON_THROW_ON_ERROR);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Internal server error'
        ], JSON_THROW_ON_ERROR);
    }

    
    // Log exception
    $duration = microtime(true) - $startTime;
    \App\Helpers\Logger::error("API Exception", [
        'message' => $exception->getMessage(),
        'duration_ms' => round($duration * 1000, 2),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'request_id' => $requestId
    ]);
});

// Load environment variables
$envFile = __DIR__ . '/../config/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

// Load configuration
$config = require __DIR__ . '/../config/app.php';
$databaseConfig = require __DIR__ . '/../config/database.php';

// Simple autoloader
spl_autoload_register(function ($className) {
    $ds = DIRECTORY_SEPARATOR;
    $className = str_replace('App\\', '', $className);
    $className = str_replace('\\', $ds, $className);
    $className = trim($className, $ds);
    
    $path = __DIR__ . '/../app/' . $className . '.php';
    
    if (is_readable($path)) {
        require $path;
        return true;
    }
    
    return false;
});

// Create database connection
try {
    if (($_ENV['DB_CONNECTION'] ?? 'mysql') === 'sqlite') {
        // SQLite Connection
        $dbPath = $databaseConfig['sqlite_path'];
        $dsn = "sqlite:{$dbPath}";
        
        // Ensure storage directory exists
        $storageDir = dirname($dbPath);
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0755, true);
        }
        
        // Ensure DB file exists (touch it if not)
        if (!file_exists($dbPath)) {
            touch($dbPath);
        }

        $db = new \App\Services\LoggedPDO($dsn, null, null, $databaseConfig['options']);
        // SQLite specific pragmas for performance/constraints
        $db->exec("PRAGMA foreign_keys = ON;");
    } else {
        // MySQL Connection
        $dsn = "mysql:host={$databaseConfig['host']};dbname={$databaseConfig['name']};charset={$databaseConfig['charset']}";
        $db = new \App\Services\LoggedPDO($dsn, $databaseConfig['user'], $databaseConfig['pass'], $databaseConfig['options']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ], JSON_THROW_ON_ERROR);
    exit;
}

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);

// Check if API request
if (strpos($path, '/api') !== 0) {
    // Web/SSR Routing
    require_once __DIR__ . '/../app/Controllers/WebController.php';
    $webController = new \App\Controllers\WebController($db);
    $webController->handle($path);
    exit;
}

// API processing continues below
$uri = str_replace('/api', '', $path);
$uriParts = explode('/', trim($uri, '/'));

// Global Middleware
$securityHeaders = new \App\Middleware\SecurityHeadersMiddleware();
$securityHeaders->handle();

$rateLimiter = new \App\Middleware\RateLimitMiddleware();
$rateLimiter->handle();

// CSRF Protection
$csrf = new \App\Middleware\CsrfMiddleware();
$csrf->handle();

// Route to appropriate controller
try {
    // Controller name mapping (plural to singular)
    $controllerMap = [
        'users' => 'User',
        'snippets' => 'Snippet',
        'auth' => 'Auth',
        'admin' => 'Admin',
        'health' => 'Health',
        'analysis' => 'Analysis',
        'collaboration' => 'Collaboration',
        'export' => 'Export',
        'tags' => 'Tag',
        'organizations' => 'Organization',
        'api-keys' => 'ApiKey',
        'errors' => 'Error'
    ];

    // Special routing for snippets (default)
    if (empty($uriParts[0]) || $uriParts[0] === 'snippets') {
        $controllerName = 'Snippet';
        
        // Check if second part is a numeric ID (RESTful GET /snippets/{id})
        if (isset($uriParts[1]) && is_numeric($uriParts[1])) {
            // Check for sub-resource/action (e.g., /snippets/1/star)
            if (isset($uriParts[2])) {
                $action = $uriParts[2];
            } else {
                $action = 'show';
            }
            
            $params = [$uriParts[1]];
            // Append any further params (if any 4th part exists?)
            if (isset($uriParts[3])) {
                $params = array_merge($params, array_slice($uriParts, 3));
            }
        } else {
            $action = $uriParts[1] ?? 'index';
            $params = array_slice($uriParts, 2);
        }
    } 
    // Special routing for /users/me/* - handle "me" as action, subpath as method
    elseif ($uriParts[0] === 'users' && isset($uriParts[1]) && $uriParts[1] === 'me') {
        $controllerName = 'User';
        // /users/me -> show, /users/me/snippets -> snippets, /users/me/activity -> activity, etc.
        if (isset($uriParts[2]) && $uriParts[2] === 'avatar') {
            $action = 'uploadAvatar';
        } else {
            $action = isset($uriParts[2]) ? $uriParts[2] : 'me';
        }
        $params = array_slice($uriParts, 3);
    }
    // Generic routing for resources (admin, organizations, etc)
    else {
        // Use mapping or capitalize first letter
        $rawController = strtolower($uriParts[0] ?? 'auth');
        $controllerName = $controllerMap[$rawController] ?? ucfirst($rawController);
        
        // Check if second part is ID (e.g. /organizations/1)
        if (isset($uriParts[1]) && is_numeric($uriParts[1])) {
             if (isset($uriParts[2])) {
                 // /organizations/1/members
                 $action = $uriParts[2];
             } else {
                 // /organizations/1
                 $action = 'show';
             }
             $params = [$uriParts[1]];
        } else {
            $rawAction = $uriParts[1] ?? 'index';
            // Convert kebab-case to camelCase
            $action = lcfirst(str_replace('-', '', ucwords($rawAction, '-')));
            $params = array_slice($uriParts, 2);
        }
    }
    
    // Include controller files
    $controllerFile = __DIR__ . "/../app/Controllers/Api/{$controllerName}Controller.php";
    
    if (!file_exists($controllerFile)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Controller not found'
        ], JSON_THROW_ON_ERROR);
        exit;
    }
    
    require_once $controllerFile;
    $controllerClass = "App\\Controllers\\Api\\{$controllerName}Controller";
    
    if (!class_exists($controllerClass)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Controller class not found'
        ], JSON_THROW_ON_ERROR);
        exit;
    }
    
    $controller = new $controllerClass($db);
    
    if (!method_exists($controller, $action)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Action not found'
        ], JSON_THROW_ON_ERROR);
        exit;
    }
    
    // Call the action
    $controller->$action($method, $params);
    
    // Log successful request
    $duration = microtime(true) - $startTime;
    \App\Helpers\Logger::info("API Request", [
        'method' => $method,
        'path' => $path,
        'duration_ms' => round($duration * 1000, 2),
        'status' => http_response_code(),
        'user_id' => $_SESSION['user_id'] ?? null,
        'request_id' => $requestId
    ]);
    
} catch (App\Exceptions\ApiException $e) {
    http_response_code($e->getStatusCode());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'errors' => $e->getErrorData()
    ], JSON_THROW_ON_ERROR);
    
} catch (Exception $e) {
    http_response_code(500);
    if ($config['debug']) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage(),
            'trace' => $e->getTrace()
        ], JSON_THROW_ON_ERROR);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Internal server error'
        ], JSON_THROW_ON_ERROR);
    }
}