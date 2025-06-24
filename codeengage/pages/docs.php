<?php
session_start();
require_once '../includes/auth.php';
require_login();
include '../includes/header.php';
?>
<section class="flex-1 flex flex-col p-8 max-w-3xl mx-auto min-h-[calc(100vh-4rem)]">
    <h1 class="text-3xl font-extrabold text-blue-400 mb-4">CodeEngage Documentation</h1>
    <div class="prose prose-invert max-w-none">
        <h2>Getting Started</h2>
        <ul>
            <li><b>Sign Up:</b> Create an account with a strong password.</li>
            <li><b>Login:</b> Access your dashboard after authentication.</li>
        </ul>
        <h2>Managing Snippets</h2>
        <ul>
            <li><b>Upload:</b> Add new code snippets with title, language, and code.</li>
            <li><b>View:</b> All users can view all uploaded snippets.</li>
            <li><b>Edit:</b> Edit your own snippets from the dashboard.</li>
            <li><b>Search:</b> Use the search bar to find snippets by title, language, code, or uploader.</li>
        </ul>
        <h2>Account Features</h2>
        <ul>
            <li><b>Profile:</b> View and update your profile information.</li>
            <li><b>Logout:</b> Log out securely from your profile page.</li>
            <li><b>Password Reset:</b> Use the forgot password link if needed.</li>
        </ul>
        <h2>UI Tips</h2>
        <ul>
            <li>Sidebar navigation for quick access to all features.</li>
            <li>Sticky footer with social links.</li>
            <li>Responsive design for all devices.</li>
        </ul>
    </div>
</section>
<?php include '../includes/header.php'; ?> 