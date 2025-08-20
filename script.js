// Gerenciador Financeiro - JavaScript
class FinancialManager {
    constructor() {
        this.transactions = [];
        this.editingIndex = -1;
        this.chart = null;
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.updateDashboard();
        this.renderTransactions();
        this.setDefaultDate();
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    setupEventListeners() {
        // Formulário
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Botões do formulário
        document.getElementById('updateBtn').addEventListener('click', () => this.updateTransaction());
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelEdit());

        // Busca e filtro
        document.getElementById('searchInput').addEventListener('input', () => this.filterTransactions());
        document.getElementById('filterType').addEventListener('change', () => this.filterTransactions());

        // Botões de ação
        document.getElementById('saveBtn').addEventListener('click', () => this.saveToJSON());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadFromJSON());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportReport());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAllData());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileLoad(e));

        // Formatação de valor
        document.getElementById('amount').addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9.,]/g, '');
            e.target.value = value;
        });
    }

    handleFormSubmit() {
        const formData = this.getFormData();
        if (!formData) return;

        if (this.editingIndex >= 0) {
            this.updateTransaction();
        } else {
            this.addTransaction(formData);
        }
    }

    getFormData() {
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value.trim();
        const date = document.getElementById('date').value;

        if (!description || !amount || !type || !category || !date) {
            this.showNotification('Por favor, preencha todos os campos!', 'error');
            return null;
        }

        if (amount <= 0) {
            this.showNotification('O valor deve ser maior que zero!', 'error');
            return null;
        }

        return {
            id: Date.now() + Math.random(),
            description,
            amount,
            type,
            category,
            date,
            createdAt: new Date().toISOString()
        };
    }

    addTransaction(transaction) {
        this.transactions.push(transaction);
        this.saveToLocalStorage();
        this.updateDashboard();
        this.renderTransactions();
        this.clearForm();
        this.showNotification('Transação adicionada com sucesso!', 'success');
    }

    editTransaction(index) {
        const transaction = this.transactions[index];
        this.editingIndex = index;

        // Preencher formulário
        document.getElementById('description').value = transaction.description;
        document.getElementById('amount').value = transaction.amount;
        document.getElementById('type').value = transaction.type;
        document.getElementById('category').value = transaction.category;
        document.getElementById('date').value = transaction.date;

        // Mostrar botões de edição
        document.querySelector('button[type="submit"]').style.display = 'none';
        document.getElementById('updateBtn').style.display = 'inline-flex';
        document.getElementById('cancelBtn').style.display = 'inline-flex';

        // Scroll para o formulário
        document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth' });
        this.showNotification('Modo de edição ativado', 'info');
    }

    updateTransaction() {
        const formData = this.getFormData();
        if (!formData) return;

        // Manter ID e data de criação originais
        formData.id = this.transactions[this.editingIndex].id;
        formData.createdAt = this.transactions[this.editingIndex].createdAt;
        formData.updatedAt = new Date().toISOString();

        this.transactions[this.editingIndex] = formData;
        this.saveToLocalStorage();
        this.updateDashboard();
        this.renderTransactions();
        this.cancelEdit();
        this.showNotification('Transação atualizada com sucesso!', 'success');
    }

    cancelEdit() {
        this.editingIndex = -1;
        this.clearForm();
        
        // Restaurar botões
        document.querySelector('button[type="submit"]').style.display = 'inline-flex';
        document.getElementById('updateBtn').style.display = 'none';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    deleteTransaction(index) {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            this.transactions.splice(index, 1);
            this.saveToLocalStorage();
            this.updateDashboard();
            this.renderTransactions();
            this.showNotification('Transação excluída com sucesso!', 'success');
        }
    }

    clearForm() {
        document.getElementById('transactionForm').reset();
        this.setDefaultDate();
    }

    updateDashboard() {
        const totals = this.calculateTotals();
        
        // Atualizar valores
        document.getElementById('totalReceitas').textContent = this.formatCurrency(totals.receitas);
        document.getElementById('totalDespesas').textContent = this.formatCurrency(totals.despesas);
        document.getElementById('saldo').textContent = this.formatCurrency(totals.saldo);

        // Atualizar cor do saldo
        const saldoElement = document.getElementById('saldo');
        saldoElement.style.color = totals.saldo >= 0 ? '#4CAF50' : '#f44336';

        // Atualizar gráfico
        this.updateChart(totals);
    }

    calculateTotals() {
        const receitas = this.transactions
            .filter(t => t.type === 'receita')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const despesas = this.transactions
            .filter(t => t.type === 'despesa')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            receitas,
            despesas,
            saldo: receitas - despesas
        };
    }

    updateChart(totals) {
        const ctx = document.getElementById('donutChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        const hasData = totals.receitas > 0 || totals.despesas > 0;
        
        if (!hasData) {
            // Gráfico vazio
            this.chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Sem dados'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['rgba(255, 255, 255, 0.1)'],
                        borderColor: ['rgba(255, 255, 255, 0.2)'],
                        borderWidth: 2
                    }]
                },
                options: this.getChartOptions()
            });
            return;
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['💚 Receitas', '❤️ Despesas'],
                datasets: [{
                    data: [totals.receitas, totals.despesas],
                    backgroundColor: [
                        'rgba(76, 175, 80, 0.8)',
                        'rgba(244, 67, 54, 0.8)'
                    ],
                    borderColor: [
                        'rgba(76, 175, 80, 1)',
                        'rgba(244, 67, 54, 1)'
                    ],
                    borderWidth: 3,
                    spacing: 5
                }]
            },
            options: this.getChartOptions()
        });
    }

    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => {
                            const value = this.formatCurrency(context.parsed);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%',
            elements: {
                arc: {
                    borderRadius: 8
                }
            }
        };
    }

    renderTransactions() {
        const container = document.getElementById('transactionsList');
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filterType = document.getElementById('filterType').value;

        let filteredTransactions = this.transactions.filter(transaction => {
            const matchesSearch = transaction.description.toLowerCase().includes(searchTerm) ||
                                transaction.category.toLowerCase().includes(searchTerm);
            const matchesFilter = !filterType || transaction.type === filterType;
            return matchesSearch && matchesFilter;
        });

        // Ordenar por data (mais recente primeiro)
        filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filteredTransactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>🔍 Nenhuma transação encontrada</p>
                    <p>Tente ajustar os filtros de busca</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTransactions.map((transaction, index) => {
            const originalIndex = this.transactions.findIndex(t => t.id === transaction.id);
            const formattedDate = new Date(transaction.date).toLocaleDateString('pt-BR');
            
            return `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <h4>${transaction.description}</h4>
                        <p>${transaction.category} • ${formattedDate}</p>
                    </div>
                    <div class="transaction-amount ${transaction.type}">
                        ${transaction.type === 'receita' ? '+' : '-'} ${this.formatCurrency(transaction.amount)}
                    </div>
                    <div class="transaction-actions">
                        <button class="btn btn-secondary btn-small" onclick="financialManager.editTransaction(${originalIndex})">
                            ✏️
                        </button>
                        <button class="btn btn-danger btn-small" onclick="financialManager.deleteTransaction(${originalIndex})">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterTransactions() {
        this.renderTransactions();
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    saveToLocalStorage() {
        localStorage.setItem('financialData', JSON.stringify(this.transactions));
    }

    loadFromLocalStorage() {
        const data = localStorage.getItem('financialData');
        if (data) {
            this.transactions = JSON.parse(data);
        }
    }

    saveToJSON() {
        const data = {
            transactions: this.transactions,
            exportDate: new Date().toISOString(),
            summary: this.calculateTotals()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financeiro_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Dados salvos com sucesso!', 'success');
    }

    loadFromJSON() {
        document.getElementById('fileInput').click();
    }

    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.transactions && Array.isArray(data.transactions)) {
                    if (confirm('Isso substituirá todos os dados atuais. Deseja continuar?')) {
                        this.transactions = data.transactions;
                        this.saveToLocalStorage();
                        this.updateDashboard();
                        this.renderTransactions();
                        this.showNotification('Dados carregados com sucesso!', 'success');
                    }
                } else {
                    throw new Error('Formato de arquivo inválido');
                }
            } catch (error) {
                this.showNotification('Erro ao carregar arquivo: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
        
        // Limpar input
        event.target.value = '';
    }

    exportReport() {
        const totals = this.calculateTotals();
        const reportDate = new Date().toLocaleDateString('pt-BR');
        
        // Agrupar por categoria
        const categoriesReceitas = {};
        const categoriesDespesas = {};
        
        this.transactions.forEach(transaction => {
            if (transaction.type === 'receita') {
                categoriesReceitas[transaction.category] = (categoriesReceitas[transaction.category] || 0) + transaction.amount;
            } else {
                categoriesDespesas[transaction.category] = (categoriesDespesas[transaction.category] || 0) + transaction.amount;
            }
        });

        const reportContent = `
# RELATÓRIO FINANCEIRO
**Data do Relatório:** ${reportDate}
**Período:** Todas as transações

## 📊 RESUMO GERAL
- **💚 Total de Receitas:** ${this.formatCurrency(totals.receitas)}
- **❤️ Total de Despesas:** ${this.formatCurrency(totals.despesas)}
- **💰 Saldo:** ${this.formatCurrency(totals.saldo)}

## 💚 RECEITAS POR CATEGORIA
${Object.entries(categoriesReceitas).map(([cat, val]) => 
    `- **${cat}:** ${this.formatCurrency(val)}`
).join('\n') || 'Nenhuma receita cadastrada'}

## ❤️ DESPESAS POR CATEGORIA
${Object.entries(categoriesDespesas).map(([cat, val]) => 
    `- **${cat}:** ${this.formatCurrency(val)}`
).join('\n') || 'Nenhuma despesa cadastrada'}

## 📋 DETALHAMENTO DAS TRANSAÇÕES
${this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => 
    `- **${new Date(t.date).toLocaleDateString('pt-BR')}** | ${t.type === 'receita' ? '💚' : '❤️'} ${t.description} (${t.category}) | ${t.type === 'receita' ? '+' : '-'} ${this.formatCurrency(t.amount)}`
).join('\n') || 'Nenhuma transação cadastrada'}

---
*Relatório gerado automaticamente pelo Gerenciador Financeiro*
        `.trim();

        const blob = new Blob([reportContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Relatório exportado com sucesso!', 'success');
    }

    clearAllData() {
        if (confirm('⚠️ ATENÇÃO: Isso apagará TODOS os dados permanentemente. Deseja continuar?')) {
            if (confirm('Tem certeza absoluta? Esta ação não pode ser desfeita!')) {
                this.transactions = [];
                this.saveToLocalStorage();
                this.updateDashboard();
                this.renderTransactions();
                this.cancelEdit();
                this.showNotification('Todos os dados foram apagados!', 'success');
            }
        }
    }

    showNotification(message, type = 'info') {
        // Remover notificação anterior se existir
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;

        // Adicionar estilos da notificação
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 400px;
                border-radius: 12px;
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                animation: slideIn 0.3s ease-out;
            }
            
            .notification-success {
                background: rgba(76, 175, 80, 0.2);
                border-color: rgba(76, 175, 80, 0.3);
            }
            
            .notification-error {
                background: rgba(244, 67, 54, 0.2);
                border-color: rgba(244, 67, 54, 0.3);
            }
            
            .notification-info {
                background: rgba(33, 150, 243, 0.2);
                border-color: rgba(33, 150, 243, 0.3);
            }
            
            .notification-content {
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: white;
                font-weight: 500;
            }
            
            .notification-content button {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 16px;
                opacity: 0.7;
                transition: opacity 0.2s ease;
            }
            
            .notification-content button:hover {
                opacity: 1;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;

        if (!document.querySelector('style[data-notification]')) {
            style.setAttribute('data-notification', 'true');
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto remover após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Inicializar aplicação
let financialManager;
document.addEventListener('DOMContentLoaded', () => {
    financialManager = new FinancialManager();
});

