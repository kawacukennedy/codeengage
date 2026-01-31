<?php

namespace App\Database;

use PDO;

abstract class Migration
{
    protected PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    abstract public function up();
    abstract public function down();
}
