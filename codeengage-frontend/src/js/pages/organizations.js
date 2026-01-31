
import Navigation from '../modules/components/navigation.js';

export class Organizations {
    constructor(app, mode = 'list', params = {}) {
        this.app = app;
        this.mode = mode; // 'list', 'create', 'details'
        this.params = params;
        this.nav = new Navigation('/organizations');
        this.data = {
            orgs: [],
            currentOrg: null,
            members: []
        };
    }

    async init() {
        await this.render();

        if (this.mode === 'list') {
            await this.loadOrganizations();
        } else if (this.mode === 'details' && this.params.id) {
            await this.loadOrganizationDetails(this.params.id);
        }
    }

    async render() {
        // Load template
        let template = '';
        try {
            const response = await fetch('/src/templates/pages/organizations.html');
            template = await response.text();
        } catch (e) {
            console.error('Failed to load template', e);
            return;
        }

        const container = document.getElementById('app');
        // Keep sidebar/nav if possible, but app architecture replaces #app content usually
        // We need to wrap it in the main layout structure if this replaces everything
        // Assuming app.js handles layout or we render full page. 
        // Based on other pages replcaing #app content entirely:

        // Re-construct full layout with sidebar + content
        // This is a bit redundant but standard for this SPA structure
        // ideally we'd fetch sidebar template too, but let's assume Navigation component handles sidebar?
        // Navigation just handles highlighting.
        // We need to check how other pages render. Dashboard renders Layout + Dashboard content?
        // Let's look at Dashboard.js... it renders into #app?

        // Assuming we need to inject into the main content area of a layout
        // For now, let's just dump into #app but wrapping in the layout div structure

        container.innerHTML = `
            <div class="flex h-screen bg-deep-space overflow-hidden">
                <div id="sidebar-container" class="w-20 lg:w-64 flex-shrink-0 z-50"></div>
                <div class="flex-1 flex flex-col min-w-0" id="main-content">
                    ${template}
                </div>
            </div>
        `;

        // Load sidebar
        // In a real build this would be cached/preloaded
        const sidebarRes = await fetch('/src/templates/components/sidebar.html');
        const sidebarHtml = await sidebarRes.text();
        document.getElementById('sidebar-container').innerHTML = sidebarHtml;
        this.nav.init(); // Highlight link

        this.updateViewMode();
        this.setupEventListeners();
    }

    updateViewMode() {
        const listEl = document.getElementById('org-list');
        const createEl = document.getElementById('org-create-form');
        const detailsEl = document.getElementById('org-details');
        const emptyEl = document.getElementById('org-empty');
        const loadingEl = document.getElementById('org-loading');

        // Reset
        [listEl, createEl, detailsEl, emptyEl, loadingEl].forEach(el => el?.classList.add('hidden'));

        const actionsEl = document.getElementById('org-actions');
        const titleEl = document.getElementById('org-page-title');

        if (this.mode === 'create') {
            createEl.classList.remove('hidden');
            titleEl.textContent = 'Create Organization';
            actionsEl.innerHTML = '';
        } else if (this.mode === 'details') {
            loadingEl.classList.remove('hidden'); // Show loading initially
            titleEl.textContent = 'Organization';
            actionsEl.innerHTML = `
                <button class="btn-secondary py-2 px-4 rounded-lg text-sm" onclick="window.app.router.navigate('/organizations')">
                    Back to List
                </button>
            `;
        } else {
            // List mode
            loadingEl.classList.remove('hidden');
            actionsEl.innerHTML = `
                <button class="btn-primary py-2 px-4 rounded-lg flex items-center" onclick="window.app.router.navigate('/organizations/new')">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    New Org
                </button>
            `;
        }
    }

    setupEventListeners() {
        // Create Form
        const createForm = document.getElementById('create-org-form');
        if (createForm) {
            createForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(createForm);
                const data = Object.fromEntries(formData.entries());

                try {
                    const res = await this.app.apiClient.post('/organizations/create', data);
                    if (res.success) {
                        this.app.showSuccess('Organization created!');
                        this.app.router.navigate(`/organizations/${res.data.id}`);
                    } else {
                        this.app.showError(res.message);
                    }
                } catch (err) {
                    this.app.showError('Failed to create organization');
                }
            });
        }

        // Tabs
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Deactivate all
                tabs.forEach(t => {
                    t.classList.remove('border-neon-blue', 'text-neon-blue');
                    t.classList.add('border-transparent', 'text-gray-400');
                });
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

                // Activate clicked
                tab.classList.add('border-neon-blue', 'text-neon-blue');
                tab.classList.remove('border-transparent', 'text-gray-400');

                const targetId = `tab-${tab.dataset.tab}`;
                document.getElementById(targetId)?.classList.remove('hidden');
            });
        });

        // Add Member Modal
        const addMemberBtn = document.getElementById('add-member-btn');
        const modal = document.getElementById('add-member-modal');
        const cancelBtn = document.getElementById('cancel-add-member');
        const confirmBtn = document.getElementById('confirm-add-member');

        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', () => modal.classList.remove('hidden'));
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
        }

        // Method toggle
        const methodRadios = document.querySelectorAll('input[name="add_method"]');
        methodRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isEmail = e.target.value === 'email';
                document.getElementById('id-input-container').classList.toggle('hidden', isEmail);
                document.getElementById('email-input-container').classList.toggle('hidden', !isEmail);
            });
        });

        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const form = document.getElementById('add-member-form');
                const method = form.querySelector('input[name="add_method"]:checked').value;
                const role = form.querySelector('[name="role"]').value;

                try {
                    let res;
                    if (method === 'id') {
                        const userId = form.querySelector('[name="user_id"]').value;
                        if (!userId) return this.app.showError('User ID required');
                        res = await this.app.apiClient.post(`/organizations/${this.params.id}/members`, {
                            user_id: userId,
                            role: role
                        });
                    } else {
                        const email = form.querySelector('[name="email"]').value;
                        if (!email) return this.app.showError('Email required');
                        res = await this.app.apiClient.post(`/organizations/${this.params.id}/invite`, {
                            email: email,
                            role: role
                        });
                    }

                    if (res.success) {
                        this.app.showSuccess(method === 'id' ? 'Member added' : 'Invitation sent');
                        modal.classList.add('hidden');
                        form.reset();
                        this.loadOrganizationDetails(this.params.id); // Reload
                    } else {
                        this.app.showError(res.message);
                    }
                } catch (err) {
                    this.app.showError('Operation failed');
                }
            });
        }
    }

    async loadOrganizations() {
        try {
            const res = await this.app.apiClient.get('/organizations');
            const loadingEl = document.getElementById('org-loading');
            const listEl = document.getElementById('org-list');
            const emptyEl = document.getElementById('org-empty');

            loadingEl.classList.add('hidden');

            if (res.success && res.data.length > 0) {
                this.data.orgs = res.data;
                listEl.classList.remove('hidden');

                listEl.innerHTML = this.data.orgs.map(org => `
                    <div class="glass p-6 rounded-2xl hover:bg-gray-800/50 transition-colors cursor-pointer" onclick="window.app.router.navigate('/organizations/${org.id}')">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 bg-gradient-to-br from-neon-blue to-neon-purple rounded-xl flex items-center justify-center text-xl font-bold text-white">
                                ${org.name.charAt(0)}
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-white">${org.name}</h3>
                                <div class="text-sm text-gray-400 flex items-center">
                                    <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                    ${org.user_role}
                                </div>
                            </div>
                        </div>
                        <div class="mt-4 flex justify-between items-center">
                            <span class="text-xs text-gray-500">codeengage.app/orgs/${org.slug}</span>
                            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        </div>
                    </div>
                `).join('');
            } else {
                emptyEl.classList.remove('hidden');
            }
        } catch (err) {
            console.error(err);
            this.app.showError('Failed to load organizations');
        }
    }

    async loadOrganizationDetails(id) {
        try {
            const res = await this.app.apiClient.get(`/organizations/${id}`);
            const memberRes = await this.app.apiClient.get(`/organizations/${id}/members`);

            const loadingEl = document.getElementById('org-loading');
            loadingEl.classList.add('hidden');

            if (res.success) {
                const org = res.data;
                this.data.currentOrg = org;
                document.getElementById('org-details').classList.remove('hidden');

                // Populate Header
                document.getElementById('detail-name').textContent = org.name;
                document.getElementById('detail-desc').textContent = org.description || 'No description provided';
                document.getElementById('detail-icon').textContent = org.name.charAt(0);
                document.getElementById('detail-slug').innerHTML = `@${org.slug} <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>`;
                document.getElementById('user-role-badge').textContent = org.role;

                // Show actions based on role
                if (['owner', 'admin'].includes(org.role)) {
                    document.getElementById('add-member-btn').classList.remove('hidden');
                    // Populate settings form
                    document.getElementById('edit-name').value = org.name;
                    document.getElementById('edit-desc').value = org.description || '';
                } else {
                    document.querySelector('[data-tab="settings"]').classList.add('hidden');
                }

                // Populate Members
                if (memberRes.success) {
                    const tbody = document.getElementById('members-table-body');
                    tbody.innerHTML = memberRes.data.map(m => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0 h-8 w-8">
                                        <img class="h-8 w-8 rounded-full bg-gray-700" src="${m.avatar_url || 'https://ui-avatars.com/api/?name=' + m.username}" alt="">
                                    </div>
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-white">${m.display_name || m.username}</div>
                                        <div class="text-sm text-gray-400">@${m.username}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${m.role === 'owner' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}">
                                    ${m.role}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                ${new Date(m.joined_at).toLocaleDateString()}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                ${(org.role === 'owner' && m.id !== this.app.auth.user.id) ?
                            `<button class="text-red-400 hover:text-red-300" onclick="alert('Remove feature coming soon')">Remove</button>` : ''}
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } catch (err) {
            console.error(err);
            this.app.showError('Failed to load organization details');
        }
    }
}
