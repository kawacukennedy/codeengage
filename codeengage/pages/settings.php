<?php
session_start();
require_once '../includes/auth.php';
require_login();
include '../includes/header.php';
?>
<section class="flex-1 flex flex-col p-8 max-w-2xl mx-auto min-h-[calc(100vh-4rem)]">
    <h1 class="text-3xl font-extrabold text-blue-400 mb-4">Settings</h1>
    <div class="prose prose-invert max-w-none">
        <p>Settings and preferences will be available here in future updates.</p>
        <ul>
            <li>Update profile information</li>
            <li>Change password</li>
            <li>Notification preferences</li>
            <li>Theme (coming soon)</li>
        </ul>
        <p>Stay tuned for more customization options!</p>
    </div>
</section>
<?php include '../includes/header.php'; ?> 