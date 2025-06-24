<?php
$confirmation = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    if ($email) {
        // Simulate password reset (in real app, send email)
        $confirmation = true;
    }
}
?>
<?php include '../includes/header.php'; ?>
<div class="flex flex-1 min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <form method="POST" class="bg-gray-900/90 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-800 flex flex-col space-y-6">
        <h2 class="text-3xl font-extrabold text-blue-400 text-center flex items-center justify-center gap-2">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 18V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2z"/><path d="M8 6v12"/></svg>
            Forgot Password
        </h2>
        <?php if ($confirmation): ?>
            <div class="bg-green-500 text-white p-2 rounded text-center">If an account with that email exists, a reset link has been sent.</div>
        <?php else: ?>
            <div class="flex flex-col gap-2">
                <label class="block mb-0.5 font-semibold text-left" for="email">Email</label>
                <input class="w-full px-3 py-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" type="email" name="email" id="email" required autofocus />
            </div>
            <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400" type="submit">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                Send Reset Link
            </button>
        <?php endif; ?>
        <div class="flex flex-col sm:flex-row sm:justify-between text-sm mt-2 gap-2">
            <a href="/pages/login.php" class="text-blue-400 hover:underline text-center">Back to login</a>
        </div>
    </form>
</div>
<?php include '../includes/footer.php'; ?> 