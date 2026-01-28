<?php

namespace App\Controllers\Api;

use App\Services\AnalysisService;
use App\Helpers\ApiResponse;
use PDO;

class AnalysisController
{
    private $service;

    public function __construct(PDO $pdo)
    {
        $this->service = new AnalysisService($pdo);
    }

    // Handle arbitrary actions
    public function __call($name, $arguments) 
    {
        // If index calls $controller->index or similar
        // We'll just define index
    }
    
    public function index($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        $code = $input['code'] ?? '';
        $language = $input['language'] ?? 'text';
        
        $result = $this->service->analyze($code, $language);
        ApiResponse::success($result);
    }
}