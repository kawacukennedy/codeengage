<?php

namespace App\Helpers;

class ValidationHelper
{
    public static function validateRequired(array $data, array $fields): array
    {
        $errors = [];
        
        foreach ($fields as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                $errors[$field] = "Field '{$field}' is required";
            }
        }
        
        if (!empty($errors)) {
            throw new \App\Exceptions\ValidationException($errors);
        }
        
        return $data;
    }

    public static function validateEmail(string $email): string
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \App\Exceptions\ValidationException(['email' => 'Invalid email format']);
        }
        
        return $email;
    }

    public static function validateLength(string $value, int $min, int $max, string $field): string
    {
        $length = strlen($value);
        
        if ($length < $min || $length > $max) {
            throw new \App\Exceptions\ValidationException([
                $field => "Field '{$field}' must be between {$min} and {$max} characters"
            ]);
        }
        
        return $value;
    }

    public static function validatePassword(string $password): string
    {
        if (strlen($password) < 8) {
            throw new \App\Exceptions\ValidationException(['password' => 'Password must be at least 8 characters long']);
        }
        
        if (!preg_match('/[A-Z]/', $password)) {
            throw new \App\Exceptions\ValidationException(['password' => 'Password must contain at least one uppercase letter']);
        }
        
        if (!preg_match('/[a-z]/', $password)) {
            throw new \App\Exceptions\ValidationException(['password' => 'Password must contain at least one lowercase letter']);
        }
        
        if (!preg_match('/[0-9]/', $password)) {
            throw new \App\Exceptions\ValidationException(['password' => 'Password must contain at least one number']);
        }
        
        return $password;
    }

    public static function sanitizeInput(string $input): string
    {
        return trim(htmlspecialchars($input, ENT_QUOTES, 'UTF-8'));
    }

    public static function validateEnum(string $value, array $allowedValues, string $field): string
    {
        if (!in_array($value, $allowedValues, true)) {
            throw new \App\Exceptions\ValidationException([
                $field => "Field '{$field}' must be one of: " . implode(', ', $allowedValues)
            ]);
        }
        
        return $value;
    }
}