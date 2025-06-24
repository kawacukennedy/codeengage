<?php
session_start();
require_once '../includes/db.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($username && $email && $password) {
        // Password strength validation
        if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/', $password)) {
            $error = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
        } else {
            // Check if email already exists
            $stmt = $conn->prepare('SELECT id FROM users WHERE email = ?');
            $stmt->bind_param('s', $email);
            $stmt->execute();
            $stmt->store_result();
            if ($stmt->num_rows > 0) {
                $error = 'Email already registered.';
            } else {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $stmt->close();
                $stmt = $conn->prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
                $stmt->bind_param('sss', $username, $email, $hash);
                if ($stmt->execute()) {
                    $_SESSION['user_id'] = $stmt->insert_id;
                    $_SESSION['username'] = $username;
                    header('Location: /pages/dashboard.php');
                    exit;
                } else {
                    $error = 'Signup failed. Please try again.';
                }
            }
            $stmt->close();
        }
    } else {
        $error = 'All fields are required.';
    }
}
?>
<?php include '../includes/header.php'; ?>
<div class="flex flex-1 min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <form method="POST" class="bg-gray-900/90 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-800 flex flex-col space-y-6">
        <h2 class="text-3xl font-extrabold text-blue-400 text-center flex items-center justify-center gap-2">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            Sign Up for CodeEngage
        </h2>
        <?php if ($error): ?>
            <div class="bg-red-500 text-white p-2 rounded text-center"> <?= htmlspecialchars($error) ?> </div>
        <?php endif; ?>
        <div class="flex flex-col gap-2">
            <label class="block mb-0.5 font-semibold text-left" for="username">Username</label>
            <input class="w-full px-3 py-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" type="text" name="username" id="username" required />
        </div>
        <div class="flex flex-col gap-2">
            <label class="block mb-0.5 font-semibold text-left" for="email">Email</label>
            <input class="w-full px-3 py-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" type="email" name="email" id="email" required />
        </div>
        <div class="flex flex-col gap-2">
            <label class="block mb-0.5 font-semibold text-left" for="password">Password</label>
            <input class="w-full px-3 py-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" type="password" name="password" id="password" required />
        </div>
        <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400" type="submit">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
            Sign Up
        </button>
        <div class="flex flex-col sm:flex-row sm:justify-between text-sm mt-2 gap-2">
            <a href="/pages/login.php" class="text-blue-400 hover:underline text-center">Already have an account? Login</a>
        </div>
    </form>
</div>
<?php include '../includes/footer.php'; ?> 