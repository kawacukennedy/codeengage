<?php

namespace App\Exceptions;

class ApiException extends \Exception
{
    protected $statusCode;
    protected $errorData;

    public function __construct(string $message, int $statusCode = 400, array $errorData = [], \Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
        $this->statusCode = $statusCode;
        $this->errorData = $errorData;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getErrorData(): array
    {
        return $this->errorData;
    }
}