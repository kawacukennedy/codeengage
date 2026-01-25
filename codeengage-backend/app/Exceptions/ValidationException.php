<?php

namespace App\Exceptions;

class ValidationException extends ApiException
{
    private $errors;

    public function __construct(array $errors, string $message = 'Validation failed')
    {
        $this->errors = $errors;
        parent::__construct($message, 422, ['errors' => $errors]);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}