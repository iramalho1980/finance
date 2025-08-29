// Sistema de Gestão Financeira - JavaScript
class FinanceManager {
    constructor() {
        this.transactions = [];
        this.currentEditId = null;
        this.currentTransactionType = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.updateDisplay();
        this.initializeCharts();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEditTransaction();
        });

        // Modal close events
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('transactionModal');
            const editModal = document.getElementById('editModal');
            if (e.target === modal) {
                this.closeModal();
            }
            if (e.target === editModal) {
                this.closeEditModal();
            }
        });

        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        document.getElementById('editDate').value = today;
    }

    // Modal Functions
    openModal(type) {
        this.currentTransactionType = type;
        const modal = document.getElementById('transactionModal');
        const modalTitle = document.getElementById('modalTitle');
        
        modalTitle.textContent = type === 'income' ? 'Adicionar Receita' : 'Adicionar Despesa';
        modal.style.display = 'block';
        
        // Clear form
        document.getElementById('transactionForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    closeModal() {
        document.getElementById('transactionModal').style.display = 'none';
        this.currentTransactionType = null;
    }

    openEditModal(id) {
        const transaction = this.transactions.find(t => t.id === id);
        if (!transaction) return;

        this.currentEditId = id;
        const modal = document.getElementById('editModal');
        
        // Fill form with transaction data
        document.getElementById('editDescription').value = transaction.description;
        document.getElementById('editAmount').value = Math.abs(transaction.amount);
        document.getElementById('editCategory').value = transaction.category;
        document.getElementById('editDate').value = transaction.date;
        
        modal.style.display = 'block';
    }

    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.currentEditId = null;
    }

    // Transaction Management
    addTransaction() {
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        if (!description || !amount || !category || !date) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        const transaction = {
            id: Date.now(),
            description,
            amount: this.currentTransactionType === 'expense' ? -Math.abs(amount) : Math.abs(amount),
            category,
            date,
            type: this.currentTransactionType
        };

        this.transactions.push(transaction);
        this.updateDisplay();
        this.saveToLocalStorage();
        this.closeModal();
    }

    saveEditTransaction() {
        const description = document.getElementById('editDescription').value;
        const amount = parseFloat(document.getElementById('editAmount').value);
        const category = document.getElementById('editCategory').value;
        const date = document.getElementById('editDate').value;

        if (!description || !amount || !category || !date) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        const transactionIndex = this.transactions.findIndex(t => t.id === this.currentEditId);
        if (transactionIndex === -1) return;

        const transaction = this.transactions[transactionIndex];
        const isExpense = transaction.amount < 0;
        
        this.transactions[transactionIndex] = {
            ...transaction,
            description,
            amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
            category,
            date
        };

        this.updateDisplay();
        this.saveToLocalStorage();
        this.closeEditModal();
    }

    deleteTransaction(id) {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.updateDisplay();
            this.saveToLocalStorage();
        }
    }

    // Display Updates
    updateDisplay() {
        this.updateBalances();
        this.updateTransactionsList();
        this.updateCharts();
    }

    updateBalances() {
        const incomes = this.transactions.filter(t => t.amount > 0);
        const expenses = this.transactions.filter(t => t.amount < 0);

        const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));
        const netBalance = totalIncome - totalExpense;

        document.getElementById('incomeBalance').textContent = this.formatCurrency(totalIncome);
        document.getElementById('expenseBalance').textContent = this.formatCurrency(totalExpense);
        document.getElementById('netBalance').textContent = this.formatCurrency(netBalance);
        
        // Color coding for net balance
        const netElement = document.getElementById('netBalance');
        if (netBalance > 0) {
            netElement.style.color = '#4CAF50';
        } else if (netBalance < 0) {
            netElement.style.color = '#f44336';
        } else {
            netElement.style.color = '#ffffff';
        }
    }

    updateTransactionsList() {
        const container = document.getElementById('transactionsList');
        
        if (this.transactions.length === 0) {
            container.innerHTML = '<p class="no-transactions">Nenhuma transação adicionada ainda</p>';
            return;
        }

        // Sort transactions by date (newest first)
        const sortedTransactions = [...this.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = sortedTransactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-details">${transaction.category} • ${this.formatDate(transaction.date)}</div>
                </div>
                <div class="transaction-amount ${transaction.amount > 0 ? 'income' : 'expense'}">
                    ${this.formatCurrency(Math.abs(transaction.amount))}
                </div>
                <div class="transaction-actions">
                    <button class="edit-btn" onclick="financeManager.openEditModal(${transaction.id})">editar</button>
                    <button class="delete-btn" onclick="financeManager.deleteTransaction(${transaction.id})">excluir</button>
                </div>
            </div>
        `).join('');
    }

    // Chart Functions
    initializeCharts() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Ubuntu',
                            size: 14,
                            weight: 500
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'rectRounded'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ff8c00',
                    borderWidth: 1,
                    cornerRadius: 10,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': R$ ' + context.parsed.y.toLocaleString('pt-BR');
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            family: 'Ubuntu',
                            size: 12,
                            weight: 400
                        },
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            family: 'Ubuntu',
                            size: 12
                        },
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            },
            elements: {
                bar: {
                    borderRadius: {
                        topLeft: 8,
                        topRight: 8,
                        bottomLeft: 0,
                        bottomRight: 0
                    },
                    borderSkipped: false
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        };

        // Comparison Chart (Bar Chart)
        this.charts.comparison = new Chart(document.getElementById('comparisonChart'), {
            type: 'bar',
            data: { 
                labels: [], 
                datasets: []
            },
            options: chartOptions
        });
    }

    updateCharts() {
        if (this.charts.comparison) {
            this.updateComparisonChart();
        }
    }

    updateComparisonChart() {
        if (!this.charts.comparison) return;
        
        // Separar receitas e despesas
        const incomes = this.transactions.filter(t => t.amount > 0);
        const expenses = this.transactions.filter(t => t.amount < 0);
        
        // Criar labels para cada transação
        const labels = [];
        const incomeData = [];
        const expenseData = [];
        
        // Adicionar receitas
        incomes.forEach(transaction => {
            labels.push(transaction.description);
            incomeData.push(transaction.amount);
            expenseData.push(0); // Preencher com 0 para manter alinhamento
        });
        
        // Adicionar despesas
        expenses.forEach(transaction => {
            labels.push(transaction.description);
            incomeData.push(0); // Preencher com 0 para manter alinhamento
            expenseData.push(Math.abs(transaction.amount));
        });
        
        // Se não há transações, mostrar gráfico vazio
        if (labels.length === 0) {
            labels.push('Nenhuma transação');
            incomeData.push(0);
            expenseData.push(0);
        }
        
        // Atualizar dados do gráfico
        this.charts.comparison.data.labels = labels;
        this.charts.comparison.data.datasets = [
            {
                label: 'Receitas',
                data: incomeData,
                backgroundColor: 'rgba(76, 175, 80, 0.8)',
                borderColor: '#4CAF50',
                borderWidth: 2,
                borderRadius: {
                    topLeft: 8,
                    topRight: 8,
                    bottomLeft: 0,
                    bottomRight: 0
                },
                borderSkipped: false
            },
            {
                label: 'Despesas',
                data: expenseData,
                backgroundColor: 'rgba(244, 67, 54, 0.8)',
                borderColor: '#f44336',
                borderWidth: 2,
                borderRadius: {
                    topLeft: 8,
                    topRight: 8,
                    bottomLeft: 0,
                    bottomRight: 0
                },
                borderSkipped: false
            }
        ];
        
        this.charts.comparison.update('active');
    }

    generateColors(count, baseColor) {
        const colors = [];
        const hue = baseColor === '#4CAF50' ? 120 : baseColor === '#f44336' ? 0 : 30;
        
        for (let i = 0; i < count; i++) {
            const saturation = 70 + (i * 10) % 30;
            const lightness = 50 + (i * 15) % 40;
            colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
        }
        
        return colors;
    }

    // Data Management
    saveData() {
        const dataStr = JSON.stringify(this.transactions, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `financas_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('Dados salvos com sucesso!');
    }

    loadData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (Array.isArray(data)) {
                        this.transactions = data;
                        this.updateDisplay();
                        this.saveToLocalStorage();
                        alert('Dados carregados com sucesso!');
                    } else {
                        alert('Formato de arquivo inválido.');
                    }
                } catch (error) {
                    alert('Erro ao carregar o arquivo. Verifique se é um arquivo JSON válido.');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    clearData() {
        if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
            this.transactions = [];
            this.updateDisplay();
            this.saveToLocalStorage();
            alert('Dados limpos com sucesso!');
        }
    }

    // Local Storage
    saveToLocalStorage() {
        localStorage.setItem('financeData', JSON.stringify(this.transactions));
    }

    loadFromLocalStorage() {
        const data = localStorage.getItem('financeData');
        if (data) {
            try {
                this.transactions = JSON.parse(data);
            } catch (error) {
                console.error('Erro ao carregar dados do localStorage:', error);
                this.transactions = [];
            }
        }
    }

    // Utility Functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(amount);
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    }
}

// Global Functions (called from HTML)
let financeManager;

function openModal(type) {
    financeManager.openModal(type);
}

function closeModal() {
    financeManager.closeModal();
}

function closeEditModal() {
    financeManager.closeEditModal();
}

function saveData() {
    financeManager.saveData();
}

function loadData() {
    financeManager.loadData();
}

function clearData() {
    financeManager.clearData();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    financeManager = new FinanceManager();
});

