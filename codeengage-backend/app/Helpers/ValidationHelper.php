<?php

namespace App\Helpers;

class ValidationHelper
{
    /**
     * Comprehensive validation with detailed error messages
     */
    public static function validate(array $data, array $rules): array
    {
        $errors = [];
        $sanitized = [];

        foreach ($rules as $field => $fieldRules) {
            $value = $data[$field] ?? null;
            $fieldErrors = [];

            foreach ($fieldRules as $rule => $params) {
                if (is_numeric($rule)) {
                    $rule = $params;
                    $params = null;
                }

                $error = self::validateField($field, $value, $rule, $params, $data);
                if ($error) {
                    $fieldErrors[] = $error;
                }
            }

            if (!empty($fieldErrors)) {
                $errors[$field] = $fieldErrors;
            }

            // Sanitize and store value
            $sanitized[$field] = self::sanitizeValue($value);
        }

        if (!empty($errors)) {
            throw new \App\Exceptions\ValidationException($errors);
        }

        return $sanitized;
    }

    /**
     * Validate a single field against a rule
     */
    private static function validateField(string $field, $value, $rule, $params = null, array $data = [])
    {
        $fieldName = self::getFieldName($field);

        switch ($rule) {
            case 'required':
                return self::validateRequiredInternal($fieldName, $value);
            
            case 'email':
                return self::validateEmailFormat($fieldName, $value);
            
            case 'url':
                return self::validateUrlFormat($fieldName, $value);
            
            case 'min':
                return self::validateMin($fieldName, $value, $params);
            
            case 'max':
                return self::validateMax($fieldName, $value, $params);
            
            case 'between':
                return self::validateBetween($fieldName, $value, $params);
            
            case 'alpha':
                return self::validateAlpha($fieldName, $value);
            
            case 'alpha_num':
                return self::validateAlphaNum($fieldName, $value);
            
            case 'alpha_dash':
                return self::validateAlphaDash($fieldName, $value);
            
            case 'numeric':
                return self::validateNumeric($fieldName, $value);
            
            case 'integer':
                return self::validateInteger($fieldName, $value);
            
            case 'boolean':
                return self::validateBoolean($fieldName, $value);
            
            case 'array':
                return self::validateArray($fieldName, $value);
            
            case 'string':
                return self::validateString($fieldName, $value);
            
            case 'regex':
                return self::validateRegex($fieldName, $value, $params);
            
            case 'in':
                return self::validateIn($fieldName, $value, $params);
            
            case 'not_in':
                return self::validateNotIn($fieldName, $value, $params);
            
            case 'confirmed':
                return self::validateConfirmed($fieldName, $value, $data);
            
            case 'different':
                return self::validateDifferent($fieldName, $value, $params, $data);
            
            case 'same':
                return self::validateSame($fieldName, $value, $params, $data);
            
            case 'password':
                return self::validatePasswordStrength($fieldName, $value);
            
            default:
                return null;
        }
    }

    /**
     * Legacy method for backward compatibility
     */
    public static function validateRequired(array $data, array $fields): array
    {
        $errors = [];
        
        foreach ($fields as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                $errors[$field] = self::getFieldName($field) . ' is required';
            }
        }
        
        if (!empty($errors)) {
            throw new \App\Exceptions\ValidationException($errors);
        }
        
        return $data;
    }

    /**
     * Legacy method for backward compatibility
     */
    public static function validateEmail(string $email): string
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \App\Exceptions\ValidationException(['email' => 'Invalid email format']);
        }
        
        return $email;
    }

    /**
     * Legacy method for backward compatibility
     */
    public static function validateLength(string $value, int $min, int $max, string $field): string
    {
        $length = strlen($value);
        
        if ($length < $min || $length > $max) {
            throw new \App\Exceptions\ValidationException([
                $field => self::getFieldName($field) . " must be between {$min} and {$max} characters"
            ]);
        }
        
        return $value;
    }

    /**
     * Legacy method for backward compatibility
     */
    public static function validatePassword(string $password): string
    {
        $error = self::validatePasswordStrength('password', $password);
        if ($error) {
            throw new \App\Exceptions\ValidationException(['password' => $error]);
        }
        
        return $password;
    }

    /**
     * Legacy method for backward compatibility
     */
    public static function sanitizeInput(string $input): string
    {
        return trim(htmlspecialchars($input, ENT_QUOTES, 'UTF-8'));
    }

    /**
     * Legacy method for backward compatibility
     */
    public static function validateEnum(string $value, array $allowedValues, string $field): string
    {
        if (!in_array($value, $allowedValues, true)) {
            throw new \App\Exceptions\ValidationException([
                $field => self::getFieldName($field) . " must be one of: " . implode(', ', $allowedValues)
            ]);
        }
        
        return $value;
    }

    /**
     * Validate required field (internal)
     */
    private static function validateRequiredInternal(string $fieldName, $value): ?string
    {
        if (is_null($value) || $value === '' || $value === []) {
            return $fieldName . ' is required.';
        }
        return null;
    }

    /**
     * Validate email format with detailed error
     */
    private static function validateEmailFormat(string $fieldName, $value): ?string
    {
        if (!is_null($value) && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            return $fieldName . ' must be a valid email address.';
        }
        return null;
    }

    /**
     * Validate URL format with detailed error
     */
    private static function validateUrlFormat(string $fieldName, $value): ?string
    {
        if (!is_null($value) && $value !== '' && !filter_var($value, FILTER_VALIDATE_URL)) {
            return $fieldName . ' must be a valid URL.';
        }
        return null;
    }

    /**
     * Validate minimum with detailed error
     */
    private static function validateMin(string $fieldName, $value, $params): ?string
    {
        if (is_null($value) || $value === '') {
            return null;
        }

        $min = is_array($params) ? ($params['value'] ?? $params['min'] ?? 0) : $params;
        
        if (is_string($value) && strlen($value) < $min) {
            return $fieldName . " must be at least {$min} characters.";
        }
        
        if (is_numeric($value) && $value < $min) {
            return $fieldName . " must be at least {$min}.";
        }
        
        if (is_array($value) && count($value) < $min) {
            return $fieldName . " must have at least {$min} items.";
        }
        
        return null;
    }

    /**
     * Validate maximum with detailed error
     */
    private static function validateMax(string $fieldName, $value, $params): ?string
    {
        if (is_null($value) || $value === '') {
            return null;
        }

        $max = is_array($params) ? ($params['value'] ?? $params['max'] ?? 255) : $params;
        
        if (is_string($value) && strlen($value) > $max) {
            return $fieldName . " must not exceed {$max} characters.";
        }
        
        if (is_numeric($value) && $value > $max) {
            return $fieldName . " must not exceed {$max}.";
        }
        
        if (is_array($value) && count($value) > $max) {
            return $fieldName . " must not have more than {$max} items.";
        }
        
        return null;
    }

    /**
     * Validate between range
     */
    private static function validateBetween(string $fieldName, $value, $params): ?string
    {
        if (is_null($value) || $value === '') {
            return null;
        }

        $min = is_array($params) ? ($params['min'] ?? $params[0] ?? 0) : ($params[0] ?? 0);
        $max = is_array($params) ? ($params['max'] ?? $params[1] ?? 255) : ($params[1] ?? 255);
        
        if (is_string($value)) {
            $length = strlen($value);
            if ($length < $min || $length > $max) {
                return $fieldName . " must be between {$min} and {$max} characters.";
            }
        }
        
        if (is_numeric($value) && ($value < $min || $value > $max)) {
            return $fieldName . " must be between {$min} and {$max}.";
        }
        
        if (is_array($value)) {
            $count = count($value);
            if ($count < $min || $count > $max) {
                return $fieldName . " must have between {$min} and {$max} items.";
            }
        }
        
        return null;
    }

    /**
     * Validate alphabetic characters
     */
    private static function validateAlpha(string $fieldName, $value): ?string
    {
        if (!is_null($value) && $value !== '' && !preg_match('/^[a-zA-Z]+$/', $value)) {
            return $fieldName . ' may only contain letters.';
        }
        return null;
    }

    /**
     * Validate alphanumeric characters
     */
    private static function validateAlphaNum(string $fieldName, $value): ?string
    {
        if (!is_null($value) && $value !== '' && !preg_match('/^[a-zA-Z0-9]+$/', $value)) {
            return $fieldName . ' may only contain letters and numbers.';
        }
        return null;
    }

    /**
     * Validate alphanumeric with dashes and underscores
     */
    private static function validateAlphaDash(string $fieldName, $value): ?string
    {
        if (!is_null($value) && $value !== '' && !preg_match('/^[a-zA-Z0-9_-]+$/', $value)) {
            return $fieldName . ' may only contain letters, numbers, dashes, and underscores.';
        }
        return null;
    }

    /**
     * Validate numeric value
     */
    private static function validateNumeric(string $fieldName, $value): ?string
    {
        if (!is_null($value) && $value !== '' && !is_numeric($value)) {
            return $fieldName . ' must be a number.';
        }
        return null;
    }

    /**
     * Validate integer value
     */
    private static function validateInteger(string $fieldName, $value): ?string
    {
        if (!is_null($value) && $value !== '' && (!is_numeric($value) || (int)$value != $value)) {
            return $fieldName . ' must be an integer.';
        }
        return null;
    }

    /**
     * Validate boolean value
     */
    private static function validateBoolean(string $fieldName, $value): ?string
    {
        if (!is_null($value) && $value !== '' && !in_array($value, [true, false, 0, 1, '0', '1', 'true', 'false'], true)) {
            return $fieldName . ' must be true or false.';
        }
        return null;
    }

    /**
     * Validate array type
     */
    private static function validateArray(string $fieldName, $value): ?string
    {
        if (!is_null($value) && $value !== '' && !is_array($value)) {
            return $fieldName . ' must be an array.';
        }
        return null;
    }

    /**
     * Validate string type
     */
    private static function validateString(string $fieldName, $value): ?string
    {
        if (!is_null($value) && $value !== '' && !is_string($value)) {
            return $fieldName . ' must be a string.';
        }
        return null;
    }

    /**
     * Validate against regex pattern
     */
    private static function validateRegex(string $fieldName, $value, $params): ?string
    {
        if (is_null($value) || $value === '') {
            return null;
        }

        $pattern = is_array($params) ? ($params['pattern'] ?? $params[0] ?? '') : $params;
        $message = is_array($params) ? ($params['message'] ?? $fieldName . ' format is invalid.') : $fieldName . ' format is invalid.';

        if (!empty($pattern) && !preg_match($pattern, $value)) {
            return $message;
        }
        
        return null;
    }

    /**
     * Validate value is in allowed list
     */
    private static function validateIn(string $fieldName, $value, $params): ?string
    {
        if (is_null($value) || $value === '') {
            return null;
        }

        $allowed = is_array($params) ? ($params['values'] ?? $params) : [];
        
        if (!in_array($value, $allowed, true)) {
            $allowedList = implode(', ', $allowed);
            return $fieldName . " must be one of: {$allowedList}.";
        }
        
        return null;
    }

    /**
     * Validate value is not in forbidden list
     */
    private static function validateNotIn(string $fieldName, $value, $params): ?string
    {
        if (is_null($value) || $value === '') {
            return null;
        }

        $forbidden = is_array($params) ? ($params['values'] ?? $params) : [];
        
        if (in_array($value, $forbidden, true)) {
            return $fieldName . ' is not allowed.';
        }
        
        return null;
    }

    /**
     * Validate password strength with detailed feedback
     */
    private static function validatePasswordStrength(string $fieldName, $value): ?string
    {
        if (is_null($value) || $value === '') {
            return null;
        }

        $errors = [];
        
        if (strlen($value) < 8) {
            $errors[] = 'at least 8 characters';
        }
        
        if (!preg_match('/[A-Z]/', $value)) {
            $errors[] = 'one uppercase letter';
        }
        
        if (!preg_match('/[a-z]/', $value)) {
            $errors[] = 'one lowercase letter';
        }
        
        if (!preg_match('/[0-9]/', $value)) {
            $errors[] = 'one number';
        }
        
        if (!preg_match('/[^A-Za-z0-9]/', $value)) {
            $errors[] = 'one special character';
        }
        
        if (!empty($errors)) {
            $lastError = array_pop($errors);
            $errorString = count($errors) > 0 ? implode(', ', $errors) . ', and ' . $lastError : $lastError;
            return $fieldName . ' must contain ' . $errorString . '.';
        }
        
        return null;
    }

    /**
     * Validate confirmed field
     */
    private static function validateConfirmed(string $fieldName, $value, array $data): ?string
    {
        $confirmationField = $fieldName . '_confirmation';
        $confirmationValue = $data[$confirmationField] ?? null;

        if (!is_null($value) && $value !== $confirmationValue) {
            return $fieldName . ' confirmation does not match.';
        }
        
        return null;
    }

    /**
     * Validate field is different from another field
     */
    private static function validateDifferent(string $fieldName, $value, $params, array $data): ?string
    {
        $otherField = is_array($params) ? ($params['field'] ?? '') : $params;
        
        if (empty($otherField)) {
            return null;
        }
        
        $otherValue = $data[$otherField] ?? null;
        $otherFieldName = self::getFieldName($otherField);

        if (!is_null($value) && $value === $otherValue) {
            return $fieldName . " and {$otherFieldName} must be different.";
        }
        
        return null;
    }

    /**
     * Validate field is same as another field
     */
    private static function validateSame(string $fieldName, $value, $params, array $data): ?string
    {
        $otherField = is_array($params) ? ($params['field'] ?? '') : $params;
        
        if (empty($otherField)) {
            return null;
        }
        
        $otherValue = $data[$otherField] ?? null;
        $otherFieldName = self::getFieldName($otherField);

        if (!is_null($value) && $value !== $otherValue) {
            return $fieldName . " and {$otherFieldName} must match.";
        }
        
        return null;
    }

    /**
     * Sanitize a single value
     */
    private static function sanitizeValue($value)
    {
        if (is_array($value)) {
            return array_map([self::class, 'sanitizeValue'], $value);
        } elseif (is_string($value)) {
            return trim(htmlspecialchars($value, ENT_QUOTES, 'UTF-8'));
        } else {
            return $value;
        }
    }

    /**
     * Generate field display name
     */
    private static function getFieldName(string $field): string
    {
        $nameMap = [
            'email' => 'Email',
            'password' => 'Password',
            'username' => 'Username',
            'display_name' => 'Display name',
            'bio' => 'Bio',
            'title' => 'Title',
            'description' => 'Description',
            'content' => 'Content',
            'snippet' => 'Snippet code',
            'language' => 'Language',
            'visibility' => 'Visibility',
            'tags' => 'Tags',
            'first_name' => 'First name',
            'last_name' => 'Last name'
        ];

        return $nameMap[$field] ?? ucwords(str_replace('_', ' ', $field));
    }

    /**
     * Batch validation helper
     */
    public static function validateBatch(array $items, array $rules): array
    {
        $errors = [];
        $sanitized = [];

        foreach ($items as $index => $item) {
            try {
                $sanitized[$index] = self::validate($item, $rules);
            } catch (\App\Exceptions\ValidationException $e) {
                $itemErrors = $e->getErrors();
                foreach ($itemErrors as $field => $fieldErrors) {
                    $errors["{$index}.{$field}"] = $fieldErrors;
                }
            }
        }

        if (!empty($errors)) {
            throw new \App\Exceptions\ValidationException($errors);
        }

        return $sanitized;
    }
}