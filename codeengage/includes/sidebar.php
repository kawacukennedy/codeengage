<aside id="sidebar" class="bg-gray-900 dark:bg-gray-100 border-r border-gray-800 dark:border-gray-200 w-16 md:w-56 flex flex-col h-screen fixed z-30 transition-all duration-300">
    <div class="flex items-center justify-between p-4">
        <a href="/pages/index.php" class="flex items-center space-x-2">
            <svg class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 18V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2z"/><path d="M8 6v12"/></svg>
            <span class="hidden md:inline text-xl font-bold text-blue-400">CodeEngage</span>
        </a>
        <button id="sidebarToggle" class="md:hidden text-gray-400 hover:text-blue-400 focus:outline-none" aria-label="Toggle sidebar">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
    </div>
    <nav class="flex-1 flex flex-col space-y-2 mt-4">
        <a href="/pages/dashboard.php" class="sidebar-link" title="Dashboard (⌘1)">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z"/></svg>
            <span class="hidden md:inline">Dashboard</span>
            <span class="ml-auto text-xs text-gray-500 hidden md:inline">⌘1</span>
        </a>
        <a href="/pages/upload.php" class="sidebar-link" title="Upload Snippet (⌘2)">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            <span class="hidden md:inline">Upload</span>
            <span class="ml-auto text-xs text-gray-500 hidden md:inline">⌘2</span>
        </a>
        <a href="/pages/profile.php" class="sidebar-link" title="Profile (⌘3)">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <span class="hidden md:inline">Profile</span>
            <span class="ml-auto text-xs text-gray-500 hidden md:inline">⌘3</span>
        </a>
        <a href="/pages/docs.php" class="sidebar-link" title="Docs (⌘4)">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M7 4h10v2H7zm0 4h10v2H7zm0 4h10v2H7zm0 4h10v2H7z"/></svg>
            <span class="hidden md:inline">Docs</span>
            <span class="ml-auto text-xs text-gray-500 hidden md:inline">⌘4</span>
        </a>
        <a href="/pages/settings.php" class="sidebar-link" title="Settings (⌘5)">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.94-2.06a1 1 0 0 0 .26-1.09l-1.43-2.49a1 1 0 0 0-.87-.5h-2.72a1 1 0 0 0-.87.5l-1.43 2.49a1 1 0 0 0 .26 1.09l2.19 1.27a1 1 0 0 0 1.09 0l2.19-1.27z"/></svg>
            <span class="hidden md:inline">Settings</span>
            <span class="ml-auto text-xs text-gray-500 hidden md:inline">⌘5</span>
        </a>
    </nav>
    <div class="p-4 mt-auto flex items-center justify-between">
        <!-- Theme toggle button removed -->
    </div>
</aside>
<script>
// Sidebar toggle for mobile
const sidebar = document.getElementById('sidebar');
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    sidebar.classList.toggle('w-56');
    sidebar.classList.toggle('w-16');
});
// Docs/Reference panel toggle with persistence
function setDocsPanelState(open) {
    const panel = document.getElementById('docsPanel');
    if (!panel) return;
    if (open) {
        panel.classList.remove('w-0', 'hidden');
        panel.classList.add('w-80', 'block');
    } else {
        panel.classList.add('w-0', 'hidden');
        panel.classList.remove('w-80', 'block');
    }
    localStorage.setItem('docsPanelOpen', open ? '1' : '0');
}
window.toggleDocsPanel = function() {
    const panel = document.getElementById('docsPanel');
    if (!panel) return;
    const open = panel.classList.contains('w-0');
    setDocsPanelState(open);
};
// On load, restore docs panel state
if (localStorage.getItem('docsPanelOpen') === '1') {
    setDocsPanelState(true);
} else {
    setDocsPanelState(false);
}
</script>
<style>
.sidebar-link {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    color: #a0aec0;
    transition: background 0.2s, color 0.2s;
    font-weight: 500;
    text-decoration: none;
}
.sidebar-link:hover, .sidebar-link:focus {
    background: #23272e;
    color: #3b82f6;
}
.dark .sidebar-link:hover, .dark .sidebar-link:focus {
    background: #e2e8f0;
    color: #3b82f6;
}
</style> 