
class ExpenseTracker {
    constructor() {
        this.transactions = this.loadTransactions();
        this.currentView = 'overview';
        this.filters = {
            type: 'all',
            category: 'all',
            month: 'all'
        };
        this.init();
    }

    init() {
        this.setCurrentDate();
        this.setupEventListeners();
        this.loadTheme();
        this.updateUI();
        this.populateMonthFilter();
    }

    // Data Management
    loadTransactions() {
        const data = localStorage.getItem('transactions');
        return data ? JSON.parse(data) : [];
    }

    saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    addTransaction(transaction) {
        const newTransaction = {
            id: Date.now().toString(),
            ...transaction,
            timestamp: new Date().toISOString()
        };
        this.transactions.unshift(newTransaction);
        this.saveTransactions();
        this.updateUI();
        this.showNotification('Transaction added successfully!', 'success');
    }

    deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveTransactions();
            this.updateUI();
            this.showNotification('Transaction deleted!', 'info');
        }
    }

    clearAllTransactions() {
        if (confirm('Are you sure you want to clear all transactions? This action cannot be undone.')) {
            this.transactions = [];
            this.saveTransactions();
            this.updateUI();
            this.showNotification('All transactions cleared!', 'info');
        }
    }

    // Calculations
    calculateTotals() {
        const filteredTransactions = this.getFilteredTransactions();
        
        const income = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const expenses = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const balance = income - expenses;

        return { income, expenses, balance };
    }

    calculateMonthlyStats(month) {
        let filtered = this.transactions;
        
        if (month !== 'all') {
            filtered = this.transactions.filter(t => {
                const transactionMonth = new Date(t.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                });
                return transactionMonth === month;
            });
        }

        const income = filtered
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const expenses = filtered
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        return {
            count: filtered.length,
            income,
            expenses,
            net: income - expenses
        };
    }

    // Filtering
    getFilteredTransactions() {
        return this.transactions.filter(transaction => {
            const typeMatch = this.filters.type === 'all' || transaction.type === this.filters.type;
            const categoryMatch = this.filters.category === 'all' || transaction.category === this.filters.category;
            return typeMatch && categoryMatch;
        });
    }

    // UI Updates
    updateUI() {
        this.updateSummaryCards();
        this.updateMonthlyStats();
        this.updateTransactionLists();
    }

    updateSummaryCards() {
        const { income, expenses, balance } = this.calculateTotals();

        document.getElementById('totalBalance').textContent = this.formatCurrency(balance);
        document.getElementById('totalIncome').textContent = this.formatCurrency(income);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(expenses);
    }

    updateMonthlyStats() {
        const stats = this.calculateMonthlyStats(this.filters.month);
        
        document.getElementById('monthTransactions').textContent = stats.count;
        document.getElementById('monthIncome').textContent = this.formatCurrency(stats.income);
        document.getElementById('monthExpenses').textContent = this.formatCurrency(stats.expenses);
        document.getElementById('monthNet').textContent = this.formatCurrency(stats.net);
    }

    updateTransactionLists() {
        // Recent transactions (last 5)
        const recentList = document.getElementById('recentTransactionList');
        const recentTransactions = this.transactions.slice(0, 5);
        
        if (recentTransactions.length === 0) {
            recentList.innerHTML = '<p class="empty-state">No transactions yet. Add your first transaction!</p>';
        } else {
            recentList.innerHTML = recentTransactions
                .map(t => this.createTransactionHTML(t))
                .join('');
        }

        // All transactions (filtered)
        const allList = document.getElementById('allTransactionList');
        const filteredTransactions = this.getFilteredTransactions();
        
        if (filteredTransactions.length === 0) {
            allList.innerHTML = '<p class="empty-state">No transactions found.</p>';
        } else {
            allList.innerHTML = filteredTransactions
                .map(t => this.createTransactionHTML(t))
                .join('');
        }
    }

    createTransactionHTML(transaction) {
        const typeClass = transaction.type;
        const amountPrefix = transaction.type === 'income' ? '+' : '-';
        const categoryIcon = this.getCategoryIcon(transaction.category);
        
        return `
            <div class="transaction-item ${typeClass}" data-testid="transaction-item-${transaction.id}">
                <div class="transaction-info">
                    <div class="transaction-title">${this.escapeHtml(transaction.title)}</div>
                    <div class="transaction-meta">
                        <span class="transaction-category" data-testid="transaction-category">
                            <i class="${categoryIcon}"></i>
                            ${transaction.category}
                        </span>
                        <span data-testid="transaction-date">${this.formatDate(transaction.date)}</span>
                    </div>
                </div>
                <div class="transaction-actions">
                    <span class="transaction-amount ${typeClass}" data-testid="transaction-amount">
                        ${amountPrefix}${this.formatCurrency(transaction.amount)}
                    </span>
                    <button 
                        class="btn-delete" 
                        onclick="tracker.deleteTransaction('${transaction.id}')"
                        data-testid="delete-transaction-btn-${transaction.id}"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    populateMonthFilter() {
        const monthFilter = document.getElementById('monthFilter');
        const months = new Set();
        
        this.transactions.forEach(t => {
            const month = new Date(t.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long' 
            });
            months.add(month);
        });

        const sortedMonths = Array.from(months).sort((a, b) => 
            new Date(b) - new Date(a)
        );

        monthFilter.innerHTML = '<option value="all">All Time</option>';
        sortedMonths.forEach(month => {
            monthFilter.innerHTML += `<option value="${month}">${month}</option>`;
        });
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Form submission
        const form = document.getElementById('transactionForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Filters
        document.getElementById('typeFilter').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.updateUI();
        });

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.updateUI();
        });

        document.getElementById('monthFilter').addEventListener('change', (e) => {
            this.filters.month = e.target.value;
            this.updateMonthlyStats();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Clear all
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllTransactions();
        });

        // Set default date to today
        document.getElementById('date').valueAsDate = new Date();
    }

    handleFormSubmit() {
        // Clear previous errors
        this.clearErrors();

        // Get form values
        const title = document.getElementById('title').value.trim();
        const amount = document.getElementById('amount').value;
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        // Validation
        let isValid = true;

        if (!title) {
            this.showError('titleError', 'Title is required');
            isValid = false;
        }

        if (!amount || parseFloat(amount) <= 0) {
            this.showError('amountError', 'Please enter a valid amount');
            isValid = false;
        }

        if (!type) {
            this.showError('typeError', 'Please select a type');
            isValid = false;
        }

        if (!category) {
            this.showError('categoryError', 'Please select a category');
            isValid = false;
        }

        if (!date) {
            this.showError('dateError', 'Date is required');
            isValid = false;
        }

        if (!isValid) return;

        // Add transaction
        this.addTransaction({
            title,
            amount: parseFloat(amount),
            type,
            category,
            date
        });

        // Reset form
        document.getElementById('transactionForm').reset();
        document.getElementById('date').valueAsDate = new Date();

        // Switch to overview
        setTimeout(() => {
            this.switchView('overview');
        }, 500);
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
    }

    clearErrors() {
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
        });
    }

    switchView(view) {
        this.currentView = view;

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === view) {
                item.classList.add('active');
            }
        });

        // Update sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        const viewMap = {
            'overview': 'overviewSection',
            'transactions': 'transactionsSection',
            'add': 'addSection'
        };

        document.getElementById(viewMap[view]).classList.add('active');

        // Update page title
        const titles = {
            'overview': 'Overview',
            'transactions': 'All Transactions',
            'add': 'Add Transaction'
        };
        document.getElementById('pageTitle').textContent = titles[view];
    }

    // Theme Management
    loadTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        this.applyTheme(theme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeToggle = document.getElementById('themeToggle');
        
        if (theme === 'dark') {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
        } else {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>';
        }
    }

    // Utility Functions
    setCurrentDate() {
        const dateElement = document.getElementById('currentDate');
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = today.toLocaleDateString('en-US', options);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(Math.abs(amount));
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getCategoryIcon(category) {
        const icons = {
            food: 'fas fa-utensils',
            travel: 'fas fa-plane',
            rent: 'fas fa-home',
            shopping: 'fas fa-shopping-bag',
            salary: 'fas fa-money-bill-wave',
            other: 'fas fa-ellipsis-h'
        };
        return icons[category] || 'fas fa-circle';
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    showNotification(message, type) {
        // Simple notification using alert (can be enhanced with custom toast)
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Initialize the tracker
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new ExpenseTracker();
});