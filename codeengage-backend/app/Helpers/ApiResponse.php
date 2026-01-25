<?php

namespace App\Helpers;

class ApiResponse
{
    public static function success($data = null, string $message = 'Success', int $status = 200)
    {
        header_remove('X-Powered-By');
        header('Content-Type: application/json');
        http_response_code($status);

        $response = [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => time()
        ];

        echo json_encode($response, JSON_THROW_ON_ERROR);
        exit;
    }

    public static function error(string $message, int $status = 400, $errors = null)
    {
        header_remove('X-Powered-By');
        header('Content-Type: application/json');
        http_response_code($status);

        $response = [
            'success' => false,
            'message' => $message,
            'timestamp' => time()
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        echo json_encode($response, JSON_THROW_ON_ERROR);
        exit;
    }

    public static function paginated($data, int $total, int $page, int $perPage, string $message = 'Success')
    {
        header_remove('X-Powered-By');
        header('Content-Type: application/json');

        $response = [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => ceil($total / $perPage),
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total)
            ],
            'timestamp' => time()
        ];

        echo json_encode($response, JSON_THROW_ON_ERROR);
        exit;
    }
}