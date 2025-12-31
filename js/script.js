const EXPENSES_KEY = 'studentExpenses';
const BUDGETS_KEY = 'categoryBudgets'; 
const TOTAL_MONEY_KEY = 'totalMoneyLimit'; 
const SELECTED_MONTH_KEY = 'selectedMonth';
const SELECTED_YEAR_KEY = 'selectedYear';




function getSelectedPeriod() {
    const today = new Date();
    const defaultMonth = today.getMonth() + 1; 
    const defaultYear = today.getFullYear();
    const month = parseInt(localStorage.getItem(SELECTED_MONTH_KEY)) || defaultMonth;
    const year = parseInt(localStorage.getItem(SELECTED_YEAR_KEY)) || defaultYear;
    
    return { month, year };
}

function saveSelectedPeriod(month, year) {
    localStorage.setItem(SELECTED_MONTH_KEY, month);
    localStorage.setItem(SELECTED_YEAR_KEY, year);
}

function getExpensesByPeriod(month, year) {
    const allExpenses = getExpenses();
    
    return allExpenses.filter(expense => {
        // Date Formate
        const expenseDate = new Date(expense.date + 'T00:00:00'); 
        
        const expenseMonth = expenseDate.getMonth() + 1; 
        const expenseYear = expenseDate.getFullYear();

        return expenseMonth === month && expenseYear === year;
    });
}


function refreshDashboardViews() {
    updateDashboardSummary();
    initializeDashboardChart();
    loadExpensesTable(); 
    loadBudgetTrackerTable(); 
}


// Storage & Data

function getExpenses() { 
    const expensesJson = localStorage.getItem(EXPENSES_KEY);
    const expenses = expensesJson ? JSON.parse(expensesJson) : [];
    return expenses.map(expense => ({
        ...expense,
        amount: parseFloat(expense.amount) 
    }));
}
function saveExpenses(expenses) { 
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

function getBudgets() { 
    const budgetsJson = localStorage.getItem(BUDGETS_KEY);
    const defaultBudgets = {
        'Food & Drinks': 200.00,
        'Transport': 100.00,
        'Utilities': 50.00,
        'Study Materials': 70.00,
        'Entertainment': 50.00,
        'Others': 30.00
    };
    return budgetsJson ? JSON.parse(budgetsJson) : defaultBudgets;
}
function saveBudgets(budgets) { 
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}
function getTotalMoney() {
    const defaultMoney = 1500.00; 
    const moneyJson = localStorage.getItem(TOTAL_MONEY_KEY);
    return moneyJson ? parseFloat(moneyJson) : defaultMoney;
}
function saveTotalMoney(amount) {
    localStorage.setItem(TOTAL_MONEY_KEY, amount.toFixed(2));
}

function editTotalMoney() {
    const currentMoney = getTotalMoney();
    const newAmount = prompt(`Enter the new Total Money limit for the month (RM):\n\nCurrent: RM ${currentMoney.toFixed(2)}`);

    if (newAmount === null) return; 

    const parsedAmount = parseFloat(newAmount);

    if (isNaN(parsedAmount) || parsedAmount < 0) {
        alert("Invalid amount. Please enter a correct number.");
        return;
    }

    saveTotalMoney(parsedAmount);
    refreshDashboardViews(); 
    alert(`Total Money has been updated to RM ${parsedAmount.toFixed(2)}.`);
}
window.editTotalMoney = editTotalMoney; 


// Dashbord 

function updateDashboardSummary() {
    const totalMoneyEl = document.getElementById('totalMoney');
    const totalSpendEl = document.getElementById('totalSpend');
    const balanceEl = document.getElementById('balance');
    
    if (!totalMoneyEl || !totalSpendEl || !balanceEl) return;

    const { month, year } = getSelectedPeriod();
    const totalLimit = getTotalMoney(); 
    const expenses = getExpensesByPeriod(month, year); 
    const totalSpend = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const balance = totalLimit - totalSpend;

    totalMoneyEl.textContent = `RM ${totalLimit.toFixed(2)}`;
    totalSpendEl.textContent = `RM ${totalSpend.toFixed(2)}`;
    balanceEl.textContent = `RM ${balance.toFixed(2)}`;
    balanceEl.className = `card-text fs-2 fw-bold ${balance < 0 ? 'text-danger' : 'text-success'}`;
}

function initializeDashboardChart() {
    const chartCanvas = document.getElementById('monthlySpendingChart'); 
    if (!chartCanvas) return; 
    if (typeof Chart === 'undefined') return;
    
    const { month, year } = getSelectedPeriod();
    const expenses = getExpensesByPeriod(month, year); 
    const categoryTotals = expenses.reduce((acc, expense) => {
        const amount = expense.amount;
        if (!isNaN(amount)) { acc[expense.category] = (acc[expense.category] || 0) + amount; }
        return acc;
    }, {});

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    
    if (labels.length === 0) { labels.push('No Expenses Recorded'); data.push(1); }
    
    const spendingData = { 
        labels: labels,
        datasets: [{
            label: 'Amount Spent (RM)',
            data: data,
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)', 
                'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(201, 203, 207, 0.8)'
            ],
            hoverOffset: 8,
            borderWidth: 1 
        }]
    };

    if (window.myDoughnutChart) {
        window.myDoughnutChart.data = spendingData;
        window.myDoughnutChart.update();
    } else {
        window.myDoughnutChart = new Chart(chartCanvas, { 
            type: 'doughnut', 
            data: spendingData,
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function loadExpensesTable() { 
    const tableBody = document.getElementById('expensesTableBody');
    if (!tableBody) return;
    
    const { month, year } = getSelectedPeriod();
    const expenses = getExpensesByPeriod(month, year) 
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tableBody.innerHTML = ''; 

    if (expenses.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">No expenses were recorded for ${month}/${year}.</td></tr>`;
        return;
    }
    
    expenses.forEach(expense => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${expense.date}</td>
            <td>${expense.category}</td>
            <td class="fw-bold">RM ${expense.amount.toFixed(2)}</td>
            <td>
                <button type="button" class='btn btn-sm btn-danger' onclick="deleteExpense(${expense.id})">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        `;
    });
}

function loadBudgetTrackerTable() {
    const tableBody = document.getElementById('budgetTrackerBody');
    if (!tableBody) return;

    const { month, year } = getSelectedPeriod();
    const expenses = getExpensesByPeriod(month, year); 
    const CATEGORY_BUDGETS = getBudgets(); 
    
    const categorySpending = expenses.reduce((acc, expense) => {
        const amount = expense.amount;
        if (!isNaN(amount) && CATEGORY_BUDGETS.hasOwnProperty(expense.category)) {
             acc[expense.category] = (acc[expense.category] || 0) + amount;
        } else if (!isNaN(amount)) {
             acc[expense.category] = (acc[expense.category] || 0) + amount;
        }
        return acc;
    }, {});
    
    tableBody.innerHTML = ''; 

    Object.keys(CATEGORY_BUDGETS).forEach(category => {
        const budget = CATEGORY_BUDGETS[category];
        const spent = categorySpending[category] ? categorySpending[category] : 0;
        const remaining = budget - spent;
        
        let status = '';
        let statusClass = '';

        if (remaining < 0) {
            status = 'OVERSPENDING!';
            statusClass = 'badge bg-danger text-white';
        } else if (remaining < (budget * 0.1) && remaining >= 0) {
            status = 'CRITICAL';
            statusClass = 'badge bg-warning text-dark';
        } else if (remaining < (budget * 0.5) && remaining >= 0) {
            status = 'MODERATE';
            statusClass = 'badge bg-secondary';
        } else {
            status = 'NORMAL';
            statusClass = 'badge bg-success';
        }

        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${category}</td>
            <td>RM ${budget.toFixed(2)}</td>
            <td class="${spent > budget ? 'text-danger fw-bold' : ''}">RM ${spent.toFixed(2)}</td>
            <td class="${remaining < 0 ? 'text-danger fw-bold' : ''}">RM ${remaining.toFixed(2)}</td>
            <td><span class="${statusClass}">${status}</span></td>
        `;
    });
}

//LOG IN

function handleLogin() { 
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return; 
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const hardcodedUsername = 'student';
        const hardcodedPassword = '123'; 
        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value.trim();
        const errorAlert = document.getElementById('loginError');

        if (usernameInput === hardcodedUsername && passwordInput === hardcodedPassword) {
            errorAlert.classList.add('d-none');
            window.location.href = 'dashboard.html'; 
        } else {
            errorAlert.classList.remove('d-none'); 
        }
    });
}

function handleExpenseForm() {
    const form = document.getElementById('recordExpenseForm');
    if (!form) return; 
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const date = document.getElementById('expenseDate').value;
        const category = document.getElementById('expenseCategory').value;
        const amountInput = document.getElementById('expenseAmount').value;
        if (!date || !category || !amountInput) { alert("Please fill in all fields."); return; }
        const amount = parseFloat(amountInput).toFixed(2);
        const newExpense = { id: Date.now(), date: date, category: category, amount: amount };
        const expenses = getExpenses(); 
        expenses.push(newExpense);
        saveExpenses(expenses); 
        alert(`RM Expenses ${amount} for ${category} has been successfully recorded!`);
        form.reset();
        refreshDashboardViews(); 
    });
}

function deleteExpense(expenseId) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    let expenses = getExpenses();
    expenses = expenses.filter(expense => expense.id !== expenseId);
    saveExpenses(expenses);
    refreshDashboardViews(); 
    alert('Expenses were successfully deleted.');
}
window.deleteExpense = deleteExpense;

function handleBudgetForm() { 
    const form = document.getElementById('editBudgetForm');
    if (!form) return;
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const newBudgets = {};
        let allValid = true;
        form.querySelectorAll('input[type="number"]').forEach(input => {
            const categoryName = input.getAttribute('data-category');
            const newAmount = parseFloat(input.value);
            if (isNaN(newAmount) || newAmount < 0) {
                alert(`Please enter a valid amount for ${categoryName}.`);
                allValid = false;
                return;
            }
            newBudgets[categoryName] = newAmount;
        });
        if (allValid) {
            saveBudgets(newBudgets);
            const modalElement = document.getElementById('editBudgetModal');
            const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
            modal.hide();
            refreshDashboardViews();
            alert('Budget changes saved successfully!');
        }
    });
}

function initializeBudgetForm() { 
    const container = document.getElementById('budgetInputsContainer');
    if (!container) return;
    const budgets = getBudgets();
    let htmlContent = '';
    Object.keys(budgets).forEach(category => {
        const amount = budgets[category].toFixed(2);
        htmlContent += `
            <div class="mb-3">
                <label for="${category.replace(/\s+/g, '')}" class="form-label fw-bold">${category}</label>
                <div class="input-group">
                    <span class="input-group-text">RM</span>
                    <input type="number" step="0.01" class="form-control" id="${category.replace(/\s+/g, '')}" value="${amount}" data-category="${category}" required>
                </div>
            </div>
        `;
    });
    container.innerHTML = htmlContent;
}

// MONTH/YEAR (DASHBOARD)

function populateMonthYearModal() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (!monthSelect || !yearSelect) return;

    const { month: selectedMonth, year: selectedYear } = getSelectedPeriod();
    
    const months = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];
    
    monthSelect.innerHTML = '';

    months.forEach((month, index) => {
        const monthValue = index + 1; 
        const option = document.createElement('option');
        option.value = String(monthValue); 
        option.textContent = month;
        if (monthValue === selectedMonth) {
            option.selected = true;
        }
        monthSelect.appendChild(option);
    });

    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';

    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = String(year);
        option.textContent = year;
        if (year === selectedYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
}

function handleMonthYearSelection() {
    const form = document.getElementById('monthYearForm');
    if (!form) return;

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const selectedMonth = parseInt(document.getElementById('monthSelect').value);
        const selectedYear = parseInt(document.getElementById('yearSelect').value);
        const selectedMonthName = document.getElementById('monthSelect').options[document.getElementById('monthSelect').selectedIndex].text;

        saveSelectedPeriod(selectedMonth, selectedYear); 

        const modalElement = document.getElementById('monthYearModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();

        document.getElementById('monthYearButtonLabel').textContent = `${selectedMonthName} ${selectedYear}`;
        refreshDashboardViews(); 
    });
}



document.addEventListener('DOMContentLoaded', function() {
    

    const { month: initMonth, year: initYear } = getSelectedPeriod();
    if (!localStorage.getItem(SELECTED_MONTH_KEY)) {
        saveSelectedPeriod(initMonth, initYear);
    }
    
    handleLogin();
    populateMonthYearModal(); 
    handleMonthYearSelection();
    refreshDashboardViews(); 
    handleExpenseForm();
    handleBudgetForm();
    const editBudgetModal = document.getElementById('editBudgetModal');
    if (editBudgetModal) {
        editBudgetModal.addEventListener('show.bs.modal', initializeBudgetForm);
    }
    
    const initialMonthName = new Date(initYear, initMonth - 1).toLocaleString('en-US', { month: 'long' });
    const buttonLabel = document.getElementById('monthYearButtonLabel');
    if (buttonLabel) {
        buttonLabel.textContent = `${initialMonthName} ${initYear}`;
    }
});