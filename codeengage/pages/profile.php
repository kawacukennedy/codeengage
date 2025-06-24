<?php
session_start();
require_once '../includes/db.php';
require_once '../includes/auth.php';
require_login();
$user = current_user();

// Fetch user info
$stmt = $conn->prepare('SELECT username, email FROM users WHERE id = ?');
$stmt->bind_param('i', $user['id']);
$stmt->execute();
$stmt->bind_result($username, $email);
$stmt->fetch();
$stmt->close();

// Handle username update
$update_msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['new_username'])) {
    $new_username = trim($_POST['new_username']);
    if ($new_username) {
        $stmt = $conn->prepare('UPDATE users SET username = ? WHERE id = ?');
        $stmt->bind_param('si', $new_username, $user['id']);
        if ($stmt->execute()) {
            $_SESSION['username'] = $new_username;
            $username = $new_username;
            $update_msg = 'Username updated!';
        }
        $stmt->close();
    }
}

// Handle snippet delete
if (isset($_GET['delete'])) {
    $snippet_id = intval($_GET['delete']);
    $stmt = $conn->prepare('DELETE FROM snippets WHERE id = ? AND user_id = ?');
    $stmt->bind_param('ii', $snippet_id, $user['id']);
    $stmt->execute();
    $stmt->close();
    header('Location: /pages/profile.php');
    exit;
}

// Fetch all user's snippets
$stmt = $conn->prepare('SELECT id, title, language, created_at FROM snippets WHERE user_id = ? ORDER BY created_at DESC');
$stmt->bind_param('i', $user['id']);
$stmt->execute();
$snippets = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();
?>
<?php include '../includes/header.php'; ?>
<div class="flex flex-1 overflow-hidden">
    <!-- Main Panel -->
    <section class="flex-1 flex flex-col p-6 min-h-[calc(100vh-4rem)] max-w-5xl mx-auto overflow-y-auto">
        <?php if ($update_msg): ?>
            <div class="bg-green-600 text-white px-4 py-2 rounded shadow mb-4 text-center animate-bounce"> <?= htmlspecialchars($update_msg) ?> </div>
        <?php endif; ?>
        <div class="bg-gray-800 p-8 rounded-2xl shadow-2xl mb-8 flex flex-col md:flex-row md:items-center md:space-x-8 items-center">
            <div class="flex flex-col items-center md:items-start flex-1">
                <div class="w-20 h-20 rounded-full bg-blue-700 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg">
                    <svg class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <form method="POST" class="w-full flex flex-col gap-4">
                    <div>
                        <label class="block mb-1 font-semibold text-gray-300">Username</label>
                        <input class="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" type="text" name="new_username" value="<?= htmlspecialchars($username) ?>" required />
                    </div>
                    <div>
                        <label class="block mb-1 font-semibold text-gray-300">Email</label>
                        <input class="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none" type="email" value="<?= htmlspecialchars($email) ?>" disabled />
                    </div>
                    <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400 mt-2" type="submit">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                        Save
                    </button>
                </form>
            </div>
            <form method="POST" action="/pages/logout.php" class="mt-8 md:mt-0 md:ml-8 flex flex-col items-center">
                <button class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-400 font-semibold shadow transition" type="submit">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    Sign Out
                </button>
            </form>
        </div>
        <h2 class="text-2xl font-bold mb-6 flex items-center gap-2 text-blue-300">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z"/></svg>
            Your Snippets
        </h2>
        <div class="bg-gray-900/80 rounded-xl p-6 shadow-lg mb-8">
            <?php if ($snippets): ?>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <?php foreach ($snippets as $snippet): ?>
                        <div class="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col relative group transition hover:shadow-xl border border-gray-700">
                            <div class="flex items-center justify-between mb-2">
                                <span class="inline-block bg-blue-700 text-xs px-2 py-1 rounded font-mono text-blue-100 uppercase tracking-wide"> <?= htmlspecialchars($snippet['language']) ?> </span>
                                <span class="text-xs text-gray-500"> <?= htmlspecialchars(date('M d, Y', strtotime($snippet['created_at']))) ?> </span>
                            </div>
                            <div class="font-bold text-lg text-blue-300 mb-1 truncate" title="<?= htmlspecialchars($snippet['title']) ?>"> <?= htmlspecialchars($snippet['title']) ?> </div>
                            <div class="flex gap-2 mt-auto">
                                <a href="/pages/edit.php?id=<?= $snippet['id'] ?>" class="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" title="Edit">
                                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                                    Edit
                                </a>
                                <a href="/pages/profile.php?delete=<?= $snippet['id'] ?>" onclick="return confirm('Delete this snippet?')" class="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition text-xs focus:outline-none focus:ring-2 focus:ring-red-400" title="Delete">
                                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6m-6 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/></svg>
                                    Delete
                                </a>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php else: ?>
                <div class="flex flex-col items-center justify-center py-12">
                    <svg class="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 17v-2a4 4 0 0 1 8 0v2"/><circle cx="12" cy="7" r="4"/><rect x="2" y="17" width="20" height="5" rx="2"/></svg>
                    <div class="text-gray-400 text-lg">No snippets uploaded yet.</div>
                </div>
            <?php endif; ?>
        </div>
    </section>
</div>
<footer class="backdrop-blur bg-gray-900/90 border-t border-gray-800 text-gray-400 py-3 px-6 flex-shrink-0 w-full mt-auto shadow-lg">
    <div class="flex flex-col md:flex-row items-center justify-between max-w-5xl mx-auto gap-2">
        <div class="flex items-center gap-2 mb-2 md:mb-0">
            <svg class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 18V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2z"/><path d="M8 6v12"/></svg>
            <span class="font-bold text-blue-400 text-lg tracking-wide">CodeEngage</span>
        </div>
        <div class="flex space-x-4">
            <a href="https://www.instagram.com/kawacu_kennedy/" target="_blank" class="hover:text-pink-400 transition flex items-center" title="Instagram">
                <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5zm4.25 2.25a5.25 5.25 0 1 1 0 10.5a5.25 5.25 0 0 1 0-10.5zm0 1.5a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5zm5.25 1.25a1 1 0 1 1-2 0a1 1 0 0 1 2 0z"/></svg>
            </a>
            <a href="#" target="_blank" class="hover:text-blue-400 transition flex items-center" title="X">
                <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 5.94c-.8.36-1.67.6-2.58.71a4.48 4.48 0 0 0 1.97-2.48a8.94 8.94 0 0 1-2.83 1.08a4.48 4.48 0 0 0-7.64 4.08A12.7 12.7 0 0 1 3.1 4.86a4.48 4.48 0 0 0 1.39 5.98a4.44 4.44 0 0 1-2.03-.56v.06a4.48 4.48 0 0 0 3.6 4.39a4.5 4.5 0 0 1-2.02.08a4.48 4.48 0 0 0 4.18 3.11A9 9 0 0 1 2 19.54a12.7 12.7 0 0 0 6.88 2.02c8.26 0 12.78-6.84 12.78-12.78c0-.2 0-.39-.01-.58A9.1 9.1 0 0 0 24 4.59a8.93 8.93 0 0 1-2.54.7z"/></svg>
            </a>
            <a href="#" target="_blank" class="hover:text-blue-300 transition flex items-center" title="LinkedIn">
                <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-7 19h-3v-7h3v7zm-1.5-8.25c-.97 0-1.75-.78-1.75-1.75s.78-1.75 1.75-1.75s1.75.78 1.75 1.75s-.78 1.75-1.75 1.75zm10.5 8.25h-3v-3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v3.5h-3v-7h3v1.08c.41-.63 1.17-1.08 2-1.08c1.66 0 3 1.34 3 3v4z"/></svg>
            </a>
            <a href="#" target="_blank" class="hover:text-orange-400 transition flex items-center" title="Reddit">
                <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88c.62.11.85-.27.85-.6c0-.3-.01-1.09-.02-2.14c-3.43.75-4.16-1.65-4.16-1.65c-.56-1.42-1.36-1.8-1.36-1.8c-1.11-.76.08-.75.08-.75c1.23.09 1.88 1.26 1.88 1.26c1.09 1.87 2.86 1.33 3.56 1.02c.11-.79.43-1.33.78-1.64c-2.74-.31-5.63-1.37-5.63-6.09c0-1.35.48-2.45 1.26-3.31c-.13-.31-.55-1.56.12-3.25c0 0 1.03-.33 3.38 1.26a11.7 11.7 0 0 1 3.08-.41c1.05.01 2.11.14 3.08.41c2.35-1.59 3.38-1.26 3.38-1.26c.67 1.69.25 2.94.12 3.25c.78.86 1.26 1.96 1.26 3.31c0 4.73-2.9 5.77-5.65 6.08c.44.38.83 1.13.83 2.28c0 1.65-.02 2.98-.02 3.39c0 .33.22.72.86.6C20.34 21.12 24 16.99 24 12z"/></svg>
            </a>
        </div>
    </div>
</footer>
</body>
</html> 