/**
 * QR Tavoli Frontend - Sistema Punti Fedeltà
 * Compatibile con backend Node.js/MongoDB
 * Deploy Ready per Render
 */
// Configurazione API
const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : 'https://qr-tavoli-system.onrender.com/api',
    TIMEOUT: 10000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Configurazione App
const APP_CONFIG = {
    SESSION_KEY: 'qr-tavoli-session',
    SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 ore
    TOAST_DURATION: 4000,
    REFRESH_INTERVAL: 30000, // 30 secondi
    MAX_TABLE_NAME_LENGTH: 50,
    MAX_POINTS_TRANSACTION: 100
};

// Stato globale dell'applicazione
const AppState = {
    currentUser: null,
    currentTable: null,
    currentTableData: null,
    isLoading: false,
    leaderboardData: [],
    recentTransactions: []
};

// Dati mock per fallback offline
const MOCK_DATA = {
    tables: [
        { id: '1', tableNumber: 1, name: 'Tavolo 1', points: 85, qrCode: 'TABLE_1' },
        { id: '2', tableNumber: 2, name: 'Tavolo VIP', points: 92, qrCode: 'TABLE_2' },
        { id: '3', tableNumber: 3, name: 'Tavolo 3', points: 34, qrCode: 'TABLE_3' },
        { id: '4', tableNumber: 4, name: 'Tavolo Famiglia', points: 67, qrCode: 'TABLE_4' },
        { id: '5', tableNumber: 5, name: 'Tavolo 5', points: 23, qrCode: 'TABLE_5' }
    ],
    user: { id: 'demo', username: 'demo', role: 'cashier', name: 'Demo User' }
};

/**
 * Utility Functions
 */
class Utils {
    // Sanitizzazione input per prevenire XSS e SQL injection
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        return input
            .trim()
            .replace(/[<>"'&]/g, '') // Rimuove caratteri HTML
            .replace(/[;\-\-\/\*]/g, '') // Rimuove caratteri SQL pericolosi
            .replace(/script|javascript|vbscript/gi, '') // Rimuove script tags
            .replace(/on\w+=/gi, '') // Rimuove event handlers
            .substring(0, APP_CONFIG.MAX_TABLE_NAME_LENGTH);
    }

    // Validazione nome tavolo
    static validateTableName(name) {
        const sanitized = this.sanitizeInput(name);

        if (!sanitized || sanitized.length === 0) {
            return { valid: false, error: 'Nome tavolo richiesto' };
        }

        if (sanitized.length > APP_CONFIG.MAX_TABLE_NAME_LENGTH) {
            return { valid: false, error: `Nome troppo lungo (max ${APP_CONFIG.MAX_TABLE_NAME_LENGTH} caratteri)` };
        }

        if (!/^[a-zA-Z0-9\s]+$/.test(sanitized)) {
            return { valid: false, error: 'Nome può contenere solo lettere, numeri e spazi' };
        }

        return { valid: true, value: sanitized };
    }

    // Validazione punti
    static validatePoints(points) {
        const num = parseInt(points);

        if (isNaN(num)) {
            return { valid: false, error: 'I punti devono essere un numero' };
        }

        if (num > APP_CONFIG.MAX_POINTS_TRANSACTION) {
            return { valid: false, error: `Massimo ${APP_CONFIG.MAX_POINTS_TRANSACTION} punti per transazione` };
        }

        if (num <= 0) {
            return { valid: false, error: 'I punti non possono essere minori di zero' };
        }

        return { valid: true, value: num };
    }

    // Formattazione data
    static formatDate(date) {
        return new Date(date).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Formattazione punti con separatori
    static formatPoints(points) {
        return new Intl.NumberFormat('it-IT').format(points);
    }

    // Debounce per ottimizzare le chiamate API
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

/**
 * Session Manager - Gestione autenticazione e memoria locale
 */
class SessionManager {
    static save(userData) {
        try {
            const session = {
                user: userData.user,
                token: userData.token,
                loginTime: Date.now(),
                expires: Date.now() + APP_CONFIG.SESSION_DURATION
            };

            localStorage.setItem(APP_CONFIG.SESSION_KEY, JSON.stringify(session));
            AppState.currentUser = session.user;

            console.log('✅ Session saved:', session.user.username);
            return true;
        } catch (error) {
            console.error('❌ Error saving session:', error);
            return false;
        }
    }

    static load() {
        try {
            const sessionData = localStorage.getItem(APP_CONFIG.SESSION_KEY);
            if (!sessionData) return null;

            const session = JSON.parse(sessionData);

            // Verifica scadenza
            if (Date.now() > session.expires) {
                this.clear();
                console.log('⏰ Session expired');
                return null;
            }

            AppState.currentUser = session.user;
            console.log('✅ Session loaded:', session.user.username);
            return session;
        } catch (error) {
            console.error('❌ Error loading session:', error);
            this.clear();
            return null;
        }
    }

    static clear() {
        try {
            localStorage.removeItem(APP_CONFIG.SESSION_KEY);
            AppState.currentUser = null;
            console.log('🧹 Session cleared');
        } catch (error) {
            console.error('❌ Error clearing session:', error);
        }
    }

    static isLoggedIn() {
        return this.load() !== null;
    }

    static getToken() {
        const session = this.load();
        return session ? session.token : null;
    }
}

/**
 * API Client - Gestione chiamate al backend
 */
class APIClient {
    static async request(endpoint, options = {}) {
        try {
            const url = `${API_CONFIG.BASE_URL}${endpoint}`;
            const token = SessionManager.getToken();

            const config = {
                method: options.method || 'GET',
                headers: {
                    ...API_CONFIG.HEADERS,
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                    ...options.headers
                },
                ...options
            };

            if (options.body && typeof options.body === 'object') {
                config.body = JSON.stringify(options.body);
            }

            console.log(`🌐 API Request: ${config.method} ${url}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ API Response: ${config.method} ${url}`, data.success ? '✓' : '✗');

            return data;
        } catch (error) {
            console.error(`❌ API Error: ${endpoint}`, error.message);
            throw error;
        }
    }

    // Auth endpoints
    static async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { username, password }
        });
    }

    static async getProfile() {
        return this.request('/auth/me');
    }

    // Table endpoints
    static async getLeaderboard() {
        return this.request('/tables/leaderboard');
    }

    static async getTableByQR(qrCode) {
        return this.request(`/tables/qr/${qrCode}`);
    }

    static async updateTableName(tableId, name) {
        return this.request(`/tables/${tableId}/name`, {
            method: 'PUT',
            body: { name }
        });
    }

    // Points endpoints
    static async addPoints(qrCode, points, description = '') {
        return this.request('/points/add', {
            method: 'POST',
            body: { qrCode, points, description }
        });
    }

    static async getTableTransactions(tableId, limit = 5) {
        return this.request(`/points/table/${tableId}/history?limit=${limit}`);
    }
}

/**
 * Toast Notifications Manager
 */
class ToastManager {
    static show(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, APP_CONFIG.TOAST_DURATION);

        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        });
    }

    static success(message) {
        this.show(message, 'success');
    }

    static error(message) {
        this.show(message, 'error');
    }

    static warning(message) {
        this.show(message, 'warning');
    }

    static info(message) {
        this.show(message, 'info');
    }
}

/**
 * Screen Manager - Gestione navigazione tra schermate
 */
class ScreenManager {
    static show(screenId) {
        // Nasconde tutte le schermate
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Mostra la schermata richiesta
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            console.log(`📱 Screen: ${screenId}`);
        }
    }

    static getCurrentScreen() {
        const activeScreen = document.querySelector('.screen.active');
        return activeScreen ? activeScreen.id : null;
    }
}

/**
 * UI Components - Gestione elementi interfaccia
 */
class UIComponents {
    static renderLeaderboard(tables, containerId, highlightTableId = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!tables || tables.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <p style="text-align: center; color: var(--gray-500);">
                        📭 Nessun tavolo trovato
                    </p>
                </div>
            `;
            return;
        }

        const html = tables.map((table, index) => {
            const position = index + 1;
            const isCurrentTable = highlightTableId && table.qrCode === highlightTableId;
            const medal = position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : '';

            let positionClass = 'position-other';
            if (position === 1) positionClass = 'position-1';
            else if (position === 2) positionClass = 'position-2';
            else if (position === 3) positionClass = 'position-3';

            return `
                <div class="leaderboard-item ${isCurrentTable ? 'current-table' : ''}">
                    <div class="leaderboard-position ${positionClass}">
                        ${medal || position}
                    </div>
                    <div class="leaderboard-info">
                        <div class="table-name">${Utils.sanitizeInput(table.name)}</div>
                    </div>
                    <div class="leaderboard-points">
                        <span>⭐</span>
                        <span>${Utils.formatPoints(table.points)}</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    static renderStats(stats) {
        if (!stats) return;

        const totalTablesEl = document.getElementById('totalTables');
        const totalPointsEl = document.getElementById('totalPoints');
        const avgPointsEl = document.getElementById('avgPoints');

        if (totalTablesEl) totalTablesEl.textContent = stats.totalTables || '-';
        if (totalPointsEl) totalPointsEl.textContent = Utils.formatPoints(stats.totalPoints) || '-';
        if (avgPointsEl) avgPointsEl.textContent = Math.round(stats.averagePoints) || '-';
    }

    static renderTransactions(transactions) {
        const container = document.getElementById('recentTransactions');
        if (!container) return;

        if (!transactions || transactions.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <p style="text-align: center; color: var(--gray-500);">
                        📝 Nessuna transazione recente
                    </p>
                </div>
            `;
            return;
        }

        const html = transactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-points ${transaction.points > 0 ? 'positive' : 'negative'}">
                        ${transaction.points > 0 ? '+' : ''}${transaction.points} punti
                    </div>
                    <div class="transaction-time">
                        ${Utils.formatDate(transaction.createdAt)}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    static showLoading(show = true) {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = show ? 'flex' : 'none';
        }
    }

    static updateHeader(user = null) {
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const userName = document.querySelector('.user-name');

        if (user) {
            loginBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            if (userName) userName.textContent = user.name || user.username;
        } else {
            loginBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');
        }
    }
}

/**
 * Modal Manager - Gestione modali
 */
class ModalManager {
    static show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    static hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    static hideAll() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
}

/**
 * App Controller - Logica principale dell'applicazione
 */
class AppController {
    constructor() {
        this.currentTableQR = null;
        this.refreshInterval = null;
    }

    async init() {
        console.log('🚀 Initializing QR Tavoli App...');

        // Carica sessione esistente
        SessionManager.load();
        UIComponents.updateHeader(AppState.currentUser);

        // Setup event listeners
        this.bindEvents();

        // Gestisci routing iniziale
        await this.handleInitialRouting();

        // Setup auto-refresh
        this.startAutoRefresh();

        console.log('✅ App initialized successfully');
    }

    bindEvents() {
        // Login/Logout buttons
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            ModalManager.show('loginModal');
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        // Login form
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            this.handleLogin(e);
        });

        // Modal close events
        document.getElementById('modalClose')?.addEventListener('click', () => {
            ModalManager.hideAll();
        });

        document.getElementById('modalOverlay')?.addEventListener('click', () => {
            ModalManager.hideAll();
        });

        document.getElementById('cancelLogin')?.addEventListener('click', () => {
            ModalManager.hideAll();
        });

        // Table name form
        document.getElementById('tableNameForm')?.addEventListener('submit', (e) => {
            this.handleTableNameUpdate(e);
        });

        // Points management (cashier)
        this.bindPointsEvents();

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ModalManager.hideAll();
            }
        });
    }

    bindPointsEvents() {
        // Quick points buttons
        document.querySelectorAll('.points-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const points = parseInt(e.currentTarget.dataset.points);
                this.handlePointsChange(points);
            });
        });

        // Custom points buttons
        document.getElementById('addCustomPoints')?.addEventListener('click', () => {
            const input = document.getElementById('customAddPoints');
            const points = parseInt(input.value);
            if (points) {
                this.handlePointsChange(points);
                input.value = '';
            }
        });
    }

    async handleInitialRouting() {
        const urlParams = new URLSearchParams(window.location.search);
        const tableQR = urlParams.get('table');

        if (tableQR) {
            this.currentTableQR = tableQR;

            // Se è cassiere loggato, vai alla dashboard cassiere
            if (AppState.currentUser && AppState.currentUser.role === 'cashier') {
                await this.showCashierDashboard(tableQR);
            } else {
                await this.showTablePage(tableQR);
            }
        } else {
            await this.showHomePage();
        }
    }

    async showHomePage() {
        UIComponents.showLoading(true);
        ScreenManager.show('homePage');

        try {
            // Carica classifica completa
            const response = await APIClient.getLeaderboard();

            if (response.success) {
                AppState.leaderboardData = response.data;
                UIComponents.renderLeaderboard(response.data, 'leaderboardContainer');

                // Calcola e mostra statistiche
                const stats = this.calculateStats(response.data);
                UIComponents.renderStats(stats);
            } else {
                throw new Error(response.message || 'Errore caricamento classifica');
            }
        } catch (error) {
            console.error('❌ Error loading homepage:', error);
            ToastManager.error('Errore caricamento dati. Modalità offline.');

            // Fallback ai dati mock
            UIComponents.renderLeaderboard(MOCK_DATA.tables, 'leaderboardContainer');
            UIComponents.renderStats({ totalTables: 5, totalPoints: 301, averagePoints: 60 });
        } finally {
            UIComponents.showLoading(false);
        }
    }

    async showTablePage(tableQR) {
        UIComponents.showLoading(true);
        ScreenManager.show('tablePage');

        try {
            // Carica dati specifici del tavolo
            const [tableResponse, leaderboardResponse] = await Promise.all([
                APIClient.getTableByQR(tableQR),
                APIClient.getLeaderboard()
            ]);

            if (tableResponse.success && leaderboardResponse.success) {
                AppState.currentTableData = tableResponse.data;
                AppState.leaderboardData = leaderboardResponse.data;

                // Aggiorna UI
                this.updateTablePageUI(tableResponse.data);
                UIComponents.renderLeaderboard(
                    leaderboardResponse.data, 
                    'tablePageLeaderboard', 
                    tableQR
                );
            } else {
                throw new Error('Errore caricamento dati tavolo');
            }
        } catch (error) {
            console.error('❌ Error loading table page:', error);
            ToastManager.error(`Errore caricamento Tavolo ${tableQR.replace('TABLE_', '')}`);

            // Fallback ai dati mock
            const mockTable = MOCK_DATA.tables.find(t => t.qrCode === tableQR) || MOCK_DATA.tables[0];
            this.updateTablePageUI(mockTable);
            UIComponents.renderLeaderboard(MOCK_DATA.tables, 'tablePageLeaderboard', tableQR);
        } finally {
            UIComponents.showLoading(false);
        }
    }

    async showCashierDashboard(tableQR) {
        UIComponents.showLoading(true);
        ScreenManager.show('cashierPage');

        try {
            // Carica dati del tavolo e transazioni recenti
            const [tableResponse, transactionsResponse] = await Promise.all([
                APIClient.getTableByQR(tableQR),
                APIClient.getTableTransactions(tableQR.replace('TABLE_', ''), 5).catch(() => ({ data: [] }))
            ]);

            if (tableResponse.success) {
                AppState.currentTableData = tableResponse.data;

                // Aggiorna UI dashboard cassiere
                this.updateCashierDashboardUI(tableResponse.data);

                if (transactionsResponse.data?.transactions) {
                    UIComponents.renderTransactions(transactionsResponse.data.transactions);
                }
            } else {
                throw new Error('Errore caricamento dati tavolo');
            }
        } catch (error) {
            console.error('❌ Error loading cashier dashboard:', error);
            ToastManager.error(`Errore caricamento Dashboard Cassiere`);

            // Fallback ai dati mock
            const mockTable = MOCK_DATA.tables.find(t => t.qrCode === tableQR) || MOCK_DATA.tables[0];
            this.updateCashierDashboardUI(mockTable);
        } finally {
            UIComponents.showLoading(false);
        }
    }

    updateTablePageUI(tableData) {
        const currentTableTitle = document.getElementById('currentTableTitle');
        const currentTablePoints = document.getElementById('currentTablePoints');
        const tableNameInput = document.getElementById('tableName');

        if (currentTableTitle) currentTableTitle.textContent = tableData.name;
        if (currentTablePoints) currentTablePoints.textContent = Utils.formatPoints(tableData.points);
        if (tableNameInput) tableNameInput.value = tableData.name;
    }

    updateCashierDashboardUI(tableData) {
        const cashierTableName = document.getElementById('cashierTableName');
        const cashierTablePoints = document.getElementById('cashierTablePoints');

        if (cashierTableName) cashierTableName.textContent = tableData.name;
        if (cashierTablePoints) cashierTablePoints.textContent = Utils.formatPoints(tableData.points);
    }

    async handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            ToastManager.error('Username e password richiesti');
            return;
        }

        const submitBtn = document.getElementById('submitLogin');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner" style="width: 20px; height: 20px;"></span>';

        try {
            const response = await APIClient.login(username, password);

            if (response.success && response.data.user.role === 'cashier') {
                // Salva sessione
                SessionManager.save(response.data);
                UIComponents.updateHeader(response.data.user);

                ModalManager.hideAll();
                ToastManager.success(`Benvenuto ${response.data.user.name || response.data.user.username}!`);

                // Se c'è un tavolo in URL, vai alla dashboard cassiere
                if (this.currentTableQR) {
                    await this.showCashierDashboard(this.currentTableQR);
                }
            } else {
                throw new Error(response.message || 'Credenziali non valide o ruolo non autorizzato');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            ToastManager.error(error.message || 'Errore login. Verifica le credenziali.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    logout() {
        SessionManager.clear();
        UIComponents.updateHeader(null);
        ToastManager.info('Logout effettuato con successo');

        // Torna alla homepage o ricarica la pagina tavolo senza privilegi
        if (this.currentTableQR) {
            this.showTablePage(this.currentTableQR);
        } else {
            this.showHomePage();
        }
    }

    async handleTableNameUpdate(e) {
        e.preventDefault();

        const tableNameInput = document.getElementById('tableName');
        const newName = tableNameInput.value.trim();

        // Validazione
        const validation = Utils.validateTableName(newName);
        if (!validation.valid) {
            ToastManager.error(validation.error);
            return;
        }

        if (!AppState.currentTableData) {
            ToastManager.error('Dati tavolo non disponibili');
            return;
        }

        try {
            const response = await APIClient.updateTableName(AppState.currentTableData.id, validation.value);

            if (response.success) {
                AppState.currentTableData.name = validation.value;
                this.updateTablePageUI(AppState.currentTableData);
                ToastManager.success('Nome tavolo aggiornato!');
            } else {
                throw new Error(response.message || 'Errore aggiornamento nome');
            }
        } catch (error) {
            console.error('❌ Error updating table name:', error);
            ToastManager.error('Errore aggiornamento nome tavolo');
        }
    }

    async handlePointsChange(points) {
        if (!AppState.currentUser || AppState.currentUser.role !== 'cashier') {
            ToastManager.error('Solo i cassieri possono modificare i punti');
            return;
        }

        if (!this.currentTableQR) {
            ToastManager.error('Tavolo non selezionato');
            return;
        }

        // Validazione punti
        const validation = Utils.validatePoints(points);
        if (!validation.valid) {
            ToastManager.error(validation.error);
            return;
        }

        try {
            const response = await APIClient.addPoints(
                this.currentTableQR, 
                validation.value, 
                ` "Aggiunta punti da cassiere"
            );

            if (response.success) {
                // Aggiorna UI con i nuovi punti
                const newPoints = response.data.table.points;
                AppState.currentTableData.points = newPoints;
                this.updateCashierDashboardUI(AppState.currentTableData);
                ToastManager.success(`${Math.abs(validation.value)} punti aggiunti con successo!`);

                // Ricarica transazioni recenti
                this.loadRecentTransactions();
            } else {
                throw new Error(response.message || 'Errore modifica punti');
            }
        } catch (error) {
            console.error('❌ Error changing points:', error);
            ToastManager.error('Errore modifica punti. Riprova.');
        }
    }

    async loadRecentTransactions() {
        if (!this.currentTableQR) return;

        try {
            const tableId = this.currentTableQR.replace('TABLE_', '');
            const response = await APIClient.getTableTransactions(tableId, 5);

            if (response.success && response.data.transactions) {
                UIComponents.renderTransactions(response.data.transactions);
            }
        } catch (error) {
            console.error('❌ Error loading transactions:', error);
        }
    }

    calculateStats(tables) {
        if (!tables || tables.length === 0) {
            return { totalTables: 0, totalPoints: 0, averagePoints: 0 };
        }

        const totalPoints = tables.reduce((sum, table) => sum + table.points, 0);
        const averagePoints = totalPoints / tables.length;

        return {
            totalTables: tables.length,
            totalPoints,
            averagePoints
        };
    }

    startAutoRefresh() {
        // Refresh automatico ogni 30 secondi per la classifica
        this.refreshInterval = setInterval(() => {
            const currentScreen = ScreenManager.getCurrentScreen();

            if (currentScreen === 'homePage') {
                this.showHomePage();
            } else if (currentScreen === 'tablePage' && this.currentTableQR) {
                this.showTablePage(this.currentTableQR);
            }
            // Non aggiorniamo la dashboard cassiere automaticamente per non interferire con le operazioni
        }, APP_CONFIG.REFRESH_INTERVAL);
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

/**
 * Inizializzazione App
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 QR Tavoli Frontend - Ready for Backend Integration!');
    console.log('🔗 API Base URL:', API_CONFIG.BASE_URL);

    // Inizializza l'applicazione
    window.app = new AppController();
    window.app.init();

    // Debug helpers (solo in development)
    if (window.location.hostname === 'localhost') {
        window.debugApp = {
            state: AppState,
            utils: Utils,
            session: SessionManager,
            api: APIClient,
            toast: ToastManager,
            screen: ScreenManager,
            modal: ModalManager
        };
        console.log('🔧 Debug helpers available in window.debugApp');
    }
});

// Cleanup al refresh pagina
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});

// Error handling globale
window.addEventListener('error', (e) => {
    console.error('❌ Global Error:', e.error);
    ToastManager.error('Si è verificato un errore. Ricarica la pagina.');
});

// Gestione errori Promise non gestite
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled Promise Rejection:', e.reason);
    e.preventDefault(); // Previeni il log di errore nel browser
});
