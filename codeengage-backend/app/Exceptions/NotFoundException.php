<?php

namespace App\Exceptions;

class NotFoundException extends ApiException
{
    public function __construct(string $resource = 'Resource')
    {
        parent::__construct("{$resource} not found", 404);
    }
}