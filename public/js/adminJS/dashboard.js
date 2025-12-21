// Professional Dashboard Management System
// Comprehensive analytics and visualization

// Global variables
let monthlyChart, expenseChart, weeklyChart, revenueDistributionChart;
let currentAnalytics = null;
let currentChartView = 'monthly';

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
  setupEventListeners();
  updateDashboard();
  
  // Auto-refresh every 5 minutes
  setInterval(updateDashboard, 5 * 60 * 1000);
});

// Setup event listeners
function setupEventListeners() {
  const periodFilter = document.getElementById('periodFilter');
  if (periodFilter) {
    periodFilter.addEventListener('change', function() {
      const isCustom = this.value === 'custom';
      document.getElementById('customDateRange').style.display = isCustom ? 'block' : 'none';
      document.getElementById('customDateRange2').style.display = isCustom ? 'block' : 'none';
    });
  }
}

// Main dashboard update function
async function updateDashboard() {
  try {
    showLoading();
    setUpdateButtonLoading(true);
    
    const period = document.getElementById('periodFilter')?.value || 'month';
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;

    let url = `/admin/dashboard-data?period=${period}`;
    if (period === 'custom' && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const analytics = await response.json();
    
    if (analytics && typeof analytics === 'object') {
      currentAnalytics = analytics;
      updateDashboardUI(analytics);
      updateCharts(analytics);
    } else {
      throw new Error('Invalid data received from server');
    }
  } catch (error) {
    console.error('Error updating dashboard:', error);
    showError(error.message || 'حدث خطأ أثناء تحميل البيانات');
  } finally {
    hideLoading();
    setUpdateButtonLoading(false);
  }
}

// Update dashboard UI with metrics
function updateDashboardUI(analytics) {
  // Update metrics cards
  updateMetricsCards(analytics);
  
  // Update teacher performance table
  updateTeacherPerformance(analytics.teacherPerformance || []);
  
  // Update expense breakdown
  updateExpenseBreakdown(analytics.expenseDetails || [], analytics.monthlyExpenses || 0);
  
  // Update revenue breakdown
  updateRevenueBreakdown(analytics.revenueBreakdown || {}, analytics.teacherPerformance || []);
}

// Update metrics cards
function updateMetricsCards(analytics) {
  const metricsRow = document.getElementById('metricsRow');
  if (!metricsRow) return;

  const metrics = [
    {
      icon: 'payments',
      label: 'إجمالي الإيرادات',
      value: analytics.monthlyIncome || 0,
      change: calculateChange(analytics.monthlyIncome, analytics.monthlyTrend),
      class: 'revenue',
      format: 'currency'
    },
    {
      icon: 'receipt_long',
      label: 'إجمالي المصروفات',
      value: analytics.monthlyExpenses || 0,
      change: calculateChange(analytics.monthlyExpenses, analytics.monthlyTrend),
      class: 'expenses',
      format: 'currency'
    },
    {
      icon: 'account_balance_wallet',
      label: 'صافي الربح',
      value: analytics.netBalance || 0,
      change: calculateChange(analytics.netBalance, analytics.monthlyTrend),
      class: 'profit',
      format: 'currency'
    },
    {
      icon: 'people',
      label: 'إجمالي الطلاب',
      value: analytics.totalStudents || 0,
      change: null,
      class: 'students',
      format: 'number'
    },
    {
      icon: 'how_to_reg',
      label: 'نسبة الحضور',
      value: analytics.monthlyAttendancePercentage || 0,
      change: null,
      class: 'attendance',
      format: 'percentage'
    },
    {
      icon: 'account_balance',
      label: 'المستحقات المعلقة',
      value: analytics.outstandingFees || 0,
      change: null,
      class: 'outstanding',
      format: 'currency'
    }
  ];

  metricsRow.innerHTML = metrics.map(metric => `
    <div class="col-lg-4 col-md-6 col-sm-6">
      <div class="metric-card ${metric.class}">
        <div class="d-flex align-items-start justify-content-between">
          <div class="flex-grow-1">
            <div class="metric-label mb-2">${metric.label}</div>
            <div class="metric-value">${formatValue(metric.value, metric.format)}</div>
            ${metric.change ? `
              <div class="metric-change ${metric.change > 0 ? 'positive' : 'negative'}">
                <i class="material-symbols-rounded" style="font-size: 14px;">
                  ${metric.change > 0 ? 'trending_up' : 'trending_down'}
                </i>
                ${Math.abs(metric.change).toFixed(1)}%
              </div>
            ` : ''}
          </div>
          <div class="metric-icon">
            <i class="material-symbols-rounded">${metric.icon}</i>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Calculate percentage change
function calculateChange(current, trendData) {
  if (!trendData || trendData.length < 2) return null;
  
  const previous = trendData[trendData.length - 2];
  const previousValue = previous?.income || previous?.expenses || previous?.profit || 0;
  
  if (previousValue === 0) return null;
  
  return ((current - previousValue) / previousValue) * 100;
}

// Format value based on type
function formatValue(value, type) {
  if (type === 'currency') {
    return formatCurrency(value);
  } else if (type === 'percentage') {
    return `${parseFloat(value).toFixed(1)}%`;
  } else {
    return formatNumber(value);
  }
}

// Update teacher performance table
function updateTeacherPerformance(teachers) {
  const container = document.getElementById('teacherPerformance');
  if (!container) return;

  if (!teachers || teachers.length === 0) {
    container.innerHTML = '<tr><td colspan="6" class="text-center py-4">لا توجد بيانات</td></tr>';
    return;
  }

  container.innerHTML = teachers.slice(0, 10).map((teacher, index) => {
    const badgeClass = index === 0 ? 'bg-gradient-warning' : 
                      index === 1 ? 'bg-gradient-secondary' : 
                      index === 2 ? 'bg-gradient-info' : 'bg-gradient-secondary';
    
    return `
      <tr>
        <td>
          <span class="badge ${badgeClass} badge-sm">${index + 1}</span>
        </td>
        <td>
          <div class="d-flex flex-column">
            <strong>${teacher.teacherName || 'N/A'}</strong>
            <small class="text-muted">${teacher.studentCount || 0} طالب</small>
          </div>
        </td>
        <td class="text-center">
          <span class="text-success fw-bold">${formatCurrency(teacher.centerFees || 0)}</span>
        </td>
        <td class="text-center">
          <span class="text-danger fw-bold">${formatCurrency(teacher.teacherInvoices || 0)}</span>
        </td>
        <td class="text-center">
          <span class="text-info fw-bold">${formatCurrency(teacher.netRevenue || 0)}</span>
        </td>
        <td class="text-center">
          <div class="d-flex align-items-center justify-content-center gap-2">
            <span class="fw-bold">${teacher.percentage || 0}%</span>
            <div class="progress" style="width: 60px; height: 8px;">
              <div class="progress-bar bg-gradient-info" 
                   style="width: ${Math.min(teacher.percentage || 0, 100)}%"></div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Update expense breakdown
function updateExpenseBreakdown(expenseDetails, totalExpenses) {
  const container = document.getElementById('expenseBreakdown');
  if (!container) return;

  // Group by category
  const categoryTotals = {};
  expenseDetails.forEach(exp => {
    const category = exp.category || 'other';
    if (!categoryTotals[category]) {
      categoryTotals[category] = { total: 0, count: 0 };
    }
    categoryTotals[category].total += exp.amount || 0;
    categoryTotals[category].count += 1;
  });

  const categories = Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category,
      ...data,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  if (categories.length === 0) {
    container.innerHTML = '<tr><td colspan="3" class="text-center py-4">لا توجد بيانات</td></tr>';
    return;
  }

  const categoryNames = {
    employee_salary: 'رواتب الموظفين',
    rent: 'إيجار',
    utilities: 'مرافق عامة',
    electric: 'كهرباء',
    water: 'مياه',
    internet: 'إنترنت',
    maintenance: 'صيانة',
    supplies: 'لوازم مكتبية',
    other: 'أخرى'
  };

  container.innerHTML = categories.map(cat => `
    <tr>
      <td>
        <strong>${categoryNames[cat.category] || cat.category}</strong>
        <br><small class="text-muted">${cat.count} فاتورة</small>
      </td>
      <td class="text-center">
        <span class="fw-bold">${formatCurrency(cat.total)}</span>
      </td>
      <td class="text-center">
        <span class="badge bg-gradient-success">${cat.percentage.toFixed(1)}%</span>
      </td>
    </tr>
  `).join('');
}

// Update revenue breakdown
function updateRevenueBreakdown(revenueBreakdown, teachers) {
  const container = document.getElementById('revenueBreakdown');
  if (!container) return;

  const studentPayments = revenueBreakdown.studentPayments || 0;
  const canteenIncome = revenueBreakdown.canteenIncome || 0;
  const teacherRevenue = (teachers || []).reduce((sum, t) => sum + (t.totalFees || 0), 0);
  const totalRevenue = studentPayments + canteenIncome + teacherRevenue;

  if (totalRevenue === 0) {
    container.innerHTML = '<tr><td colspan="3" class="text-center py-4">لا توجد بيانات</td></tr>';
    return;
  }

  const breakdown = [];
  
  if (studentPayments > 0) {
    breakdown.push({
      source: 'مدفوعات الطلاب',
      amount: studentPayments,
      percentage: (studentPayments / totalRevenue * 100)
    });
  }
  
  if (canteenIncome > 0) {
    breakdown.push({
      source: 'إيرادات المقصف',
      amount: canteenIncome,
      percentage: (canteenIncome / totalRevenue * 100)
    });
  }

  (teachers || []).forEach(teacher => {
    if (teacher.totalFees > 0) {
      breakdown.push({
        source: teacher.teacherName,
        amount: teacher.totalFees,
        percentage: (teacher.totalFees / totalRevenue * 100)
      });
    }
  });

  container.innerHTML = breakdown.map(item => `
    <tr>
      <td>
        <strong>${item.source}</strong>
      </td>
      <td class="text-center">
        <span class="fw-bold text-success">${formatCurrency(item.amount)}</span>
      </td>
      <td class="text-center">
        <span class="badge bg-gradient-info">${item.percentage.toFixed(1)}%</span>
      </td>
    </tr>
  `).join('');
}

// Update all charts
function updateCharts(analytics) {
  if (currentChartView === 'monthly') {
    updateMonthlyChart(analytics.monthlyData || []);
  } else {
    updateWeeklyChart(analytics.weeklyData || []);
  }
  
  updateExpenseChart(analytics.expenseCategories || {});
  updateRevenueDistributionChart(
    analytics.teacherPerformance || [],
    analytics.revenueBreakdown || {}
  );
}

// Update monthly chart
function updateMonthlyChart(monthlyData) {
  const ctx = document.getElementById('monthlyChart');
  if (!ctx) return;

  if (monthlyChart) {
    monthlyChart.destroy();
  }

  monthlyChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: monthlyData.map(item => item.month),
      datasets: [{
        label: 'الإيرادات',
        data: monthlyData.map(item => item.revenue || 0),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true
      }, {
        label: 'المصروفات',
        data: monthlyData.map(item => item.expenses || 0),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true
      }, {
        label: 'صافي الربح',
        data: monthlyData.map(item => item.profit || 0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// Update weekly chart
function updateWeeklyChart(weeklyData) {
  const ctx = document.getElementById('monthlyChart');
  if (!ctx) return;

  if (monthlyChart) {
    monthlyChart.destroy();
  }

  monthlyChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: weeklyData.map(item => item.week),
      datasets: [{
        label: 'الإيرادات',
        data: weeklyData.map(item => item.revenue || 0),
        backgroundColor: '#22c55e',
        borderColor: '#22c55e',
        borderWidth: 1
      }, {
        label: 'المصروفات',
        data: weeklyData.map(item => item.expenses || 0),
        backgroundColor: '#ef4444',
        borderColor: '#ef4444',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// Update expense chart
function updateExpenseChart(expenseCategories) {
  const ctx = document.getElementById('expenseChart');
  if (!ctx) return;

  if (expenseChart) {
    expenseChart.destroy();
  }

  const labels = [];
  const data = [];
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6'];

  Object.entries(expenseCategories).forEach(([category, amount], index) => {
    if (amount > 0) {
      labels.push(getCategoryName(category));
      data.push(amount);
    }
  });

  if (data.length === 0) {
    return;
  }

  expenseChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, data.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Update revenue distribution chart
function updateRevenueDistributionChart(teachers, revenueBreakdown) {
  const ctx = document.getElementById('revenueDistributionChart');
  if (!ctx) return;

  if (revenueDistributionChart) {
    revenueDistributionChart.destroy();
  }

  const labels = [];
  const data = [];
  const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#10b981', '#06b6d4'];

  if (revenueBreakdown.canteenIncome > 0) {
    labels.push('إيرادات المقصف');
    data.push(revenueBreakdown.canteenIncome);
  }

  teachers.forEach((teacher, index) => {
    if (teacher.totalFees > 0) {
      labels.push(teacher.teacherName);
      data.push(teacher.totalFees);
    }
  });

  if (data.length === 0) {
    return;
  }

  revenueDistributionChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, data.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Update weekly chart
function updateWeeklyChart(weeklyData) {
  const ctx = document.getElementById('weeklyChart');
  if (!ctx) return;

  if (weeklyChart) {
    weeklyChart.destroy();
  }

  weeklyChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: weeklyData.map(item => item.week),
      datasets: [{
        label: 'الإيرادات',
        data: weeklyData.map(item => item.revenue || 0),
        backgroundColor: '#22c55e',
        borderColor: '#22c55e',
        borderWidth: 1
      }, {
        label: 'المصروفات',
        data: weeklyData.map(item => item.expenses || 0),
        backgroundColor: '#ef4444',
        borderColor: '#ef4444',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// Switch chart view
function switchChartView(view) {
  currentChartView = view;
  const buttons = document.querySelectorAll('.btn-group button');
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  if (currentAnalytics) {
    updateCharts(currentAnalytics);
  }
}

// Export dashboard
function exportDashboard() {
  if (!currentAnalytics) {
    alert('لا توجد بيانات للتصدير');
    return;
  }
  
  // Create export data
  const exportData = {
    period: document.getElementById('periodFilter').value,
    date: new Date().toLocaleDateString('ar-EG'),
    metrics: {
      revenue: currentAnalytics.monthlyIncome,
      expenses: currentAnalytics.monthlyExpenses,
      profit: currentAnalytics.netBalance,
      students: currentAnalytics.totalStudents,
      attendance: currentAnalytics.monthlyAttendancePercentage
    },
    teacherPerformance: currentAnalytics.teacherPerformance || [],
    expenseBreakdown: currentAnalytics.expenseDetails || []
  };
  
  // Convert to JSON and download
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Utility functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function formatNumber(number) {
  return new Intl.NumberFormat('ar-EG').format(number || 0);
}

function getCategoryName(category) {
  const names = {
    employee_salary: 'رواتب الموظفين',
    rent: 'إيجار',
    utilities: 'مرافق عامة',
    electric: 'كهرباء',
    water: 'مياه',
    internet: 'إنترنت',
    maintenance: 'صيانة',
    supplies: 'لوازم مكتبية',
    other: 'أخرى'
  };
  return names[category] || category;
}

function showLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

function setUpdateButtonLoading(isLoading) {
  const updateBtn = document.getElementById('updateBtn');
  const updateIcon = document.getElementById('updateIcon');
  const updateText = document.getElementById('updateText');
  
  if (isLoading) {
    if (updateBtn) updateBtn.disabled = true;
    if (updateIcon) {
      updateIcon.textContent = 'sync';
      updateIcon.style.animation = 'spin 1s linear infinite';
    }
    if (updateText) updateText.textContent = 'جاري التحميل...';
  } else {
    if (updateBtn) updateBtn.disabled = false;
    if (updateIcon) {
      updateIcon.textContent = 'refresh';
      updateIcon.style.animation = '';
    }
    if (updateText) updateText.textContent = 'تحديث البيانات';
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
  errorDiv.style.cssText = 'top: 20px; right: 20px; z-index: 10000; min-width: 300px;';
  errorDiv.innerHTML = `
    <strong>خطأ!</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

