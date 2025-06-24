<?php
function require_login() {
    if (empty($_SESSION['user_id'])) {
        header('Location: /pages/login.php');
        exit;
    }
}

function current_user() {
    return [
        'id' => $_SESSION['user_id'] ?? null,
        'username' => $_SESSION['username'] ?? null
    ];
}
?> 