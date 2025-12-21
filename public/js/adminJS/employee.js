// Employee Management System
let allEmployees = [];

// Global variables for modals
let currentEmployeeId = null;
let currentDeductionEmployeeId = null;
let currentPaymentEmployeeId = null;

// Load employees on page load
document.addEventListener('DOMContentLoaded', function() {
    loadEmployees();
    
    // Search functionality
    const searchEmployeeInput = document.getElementById('searchEmployee');
    if (searchEmployeeInput) {
        searchEmployeeInput.addEventListener('input', function() {
            filterEmployees();
        });
    }
    
    // Filter functionality
    const filterEmployeeType = document.getElementById('filterEmployeeType');
    const filterEmploymentType = document.getElementById('filterEmploymentType');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    if (filterEmployeeType) {
        filterEmployeeType.addEventListener('change', filterEmployees);
    }
    
    if (filterEmploymentType) {
        filterEmploymentType.addEventListener('change', filterEmployees);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            if (searchEmployeeInput) searchEmployeeInput.value = '';
            if (filterEmployeeType) filterEmployeeType.value = '';
            if (filterEmploymentType) filterEmploymentType.value = '';
            filterEmployees();
        });
    }
    
    // Fix modal backdrop issue - remove backdrop when modal is hidden
    const modals = ['editEmployeeModal', 'addDeductionModal', 'viewSalaryHistoryModal', 'paySalaryModal'];
    modals.forEach(modalId => {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            // Handle when modal is completely hidden
            modalElement.addEventListener('hidden.bs.modal', function() {
                // Remove all backdrops
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                // Remove modal-open class and styles from body
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            });
            
            // Also handle when modal starts hiding
            modalElement.addEventListener('hide.bs.modal', function() {
                // Ensure backdrop removal
                setTimeout(() => {
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(backdrop => backdrop.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                }, 150);
            });
        }
    });
    
    // Global fix for any modal backdrop issues
    document.addEventListener('click', function(e) {
        // If clicking on backdrop, ensure it gets removed
        if (e.target.classList.contains('modal-backdrop')) {
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => {
                    if (!backdrop.classList.contains('show')) {
                        backdrop.remove();
                    }
                });
            }, 300);
        }
    });
    
    // Add employee form submission
    const addEmployeeForm = document.getElementById('addEmployeeForm');
    if (addEmployeeForm) {
        addEmployeeForm.addEventListener('submit', handleAddEmployee);
    }
    
    // Employment type change handler
    const employmentType = document.getElementById('employmentType');
    const salaryGroup = document.getElementById('salaryGroup');
    const hourlyRateGroup = document.getElementById('hourlyRateGroup');
    
    if (employmentType) {
        employmentType.addEventListener('change', function() {
            if (this.value === 'Part-Time') {
                salaryGroup.style.display = 'none';
                hourlyRateGroup.style.display = 'block';
                document.getElementById('employeeSalary').required = false;
                document.getElementById('hourlyRate').required = true;
            } else {
                salaryGroup.style.display = 'block';
                hourlyRateGroup.style.display = 'none';
                document.getElementById('employeeSalary').required = true;
                document.getElementById('hourlyRate').required = false;
            }
        });
    }

    // Edit employee employment type handler
    const editEmploymentType = document.getElementById('editEmploymentType');
    if (editEmploymentType) {
        editEmploymentType.addEventListener('change', function() {
            const editSalaryGroup = document.getElementById('editSalaryGroup');
            const editHourlyRateGroup = document.getElementById('editHourlyRateGroup');
            if (this.value === 'Part-Time') {
                editSalaryGroup.style.display = 'none';
                editHourlyRateGroup.style.display = 'block';
    } else {
                editSalaryGroup.style.display = 'block';
                editHourlyRateGroup.style.display = 'none';
            }
        });
    }

    // Payment form handlers
    const paySalaryForm = document.getElementById('paySalaryForm');
    if (paySalaryForm) {
        ['baseSalary', 'bonuses', 'extras', 'deductions', 'hoursWorked'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', calculateTotalAmount);
            }
        });
        
        // Add event listener for payment month change to reload deductions
        const paymentMonthInput = document.getElementById('paymentMonth');
        if (paymentMonthInput) {
            paymentMonthInput.addEventListener('change', async function() {
                const employeeId = document.getElementById('paymentEmployeeId').value;
                if (employeeId && this.value) {
                    await loadDeductionsForMonth(employeeId, this.value);
                    calculateTotalAmount();
                }
            });
        }
    }

    // Edit employee save button
    const saveEditEmployeeBtn = document.getElementById('saveEditEmployeeBtn');
    if (saveEditEmployeeBtn) {
        saveEditEmployeeBtn.addEventListener('click', handleEditEmployee);
    }

    // Deduction save button
    const saveDeductionBtn = document.getElementById('saveDeductionBtn');
    if (saveDeductionBtn) {
        saveDeductionBtn.addEventListener('click', handleAddDeduction);
    }

    // Payment save button
    const savePaymentBtn = document.getElementById('savePaymentBtn');
    if (savePaymentBtn) {
        savePaymentBtn.addEventListener('click', handlePaySalary);
    }

    // Add payment button in salary history modal
    const addPaymentBtn = document.getElementById('addPaymentBtn');
    if (addPaymentBtn) {
        addPaymentBtn.addEventListener('click', openPaySalaryModal);
    }
});

// Currency formatter
function formatCurrency(amount) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

// Load all employees
async function loadEmployees() {
  try {
    const response = await fetch('/admin/all-employee');
    if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const employees = await response.json();
        allEmployees = employees || [];
        renderEmployees(allEmployees);
    } catch (error) {
        console.error('Error loading employees:', error);
        allEmployees = [];
        renderEmployees([]);
        showNotification('error', 'حدث خطأ أثناء تحميل قائمة الموظفين');
    }
}

// Render employees table
function renderEmployees(employees) {
    const tbody = document.querySelector('#employeeTable tbody') || document.getElementById('employeeTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!employees || employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد بيانات موظفين</td></tr>';
        return;
    }
    
    employees.forEach(employee => {
        const row = document.createElement('tr');
        const employeeTypeText = employee.employeeType === 'teacher' ? 'مدرس' : 'أخرى';
        const employmentTypeText = employee.employmentType === 'Full-Time' ? 'دوام كامل' : 'دوام جزئي';
        const salaryText = employee.employmentType === 'Full-Time' 
            ? formatCurrency(employee.employeeSalary)
            : `${formatCurrency(employee.hourlyRate)}/ساعة`;
        
        row.innerHTML = `
            <td class="text-center align-middle">
                <h6 class="text-sm font-weight-bold mb-0">${employee.employeeCode || 'N/A'}</h6>
            </td>
            <td class="text-center align-middle">
                <h6 class="text-sm font-weight-bold mb-0">${employee.employeeName || ''}</h6>
        </td>
            <td class="text-center align-middle">${employee.employeePhoneNumber || ''}</td>
            <td class="text-center align-middle">${employeeTypeText}</td>
            <td class="text-center align-middle">${employmentTypeText}</td>
            <td class="text-center align-middle">${salaryText}</td>
            <td class="text-center align-middle">
                <button class="btn btn-sm edit-employee-btn" onclick="editEmployee('${employee._id}')" title="تعديل">
                    <i class="material-symbols-rounded text-sm">edit</i>
                </button>
                <button class="btn btn-sm btn-info text-white" onclick="viewSalaryHistory('${employee._id}')" title="سجل الرواتب">
                    <i class="material-symbols-rounded text-sm">payments</i>
                </button>
                <button class="btn btn-sm btn-warning text-white" onclick="addDeduction('${employee._id}')" title="إضافة خصم">
                    <i class="material-symbols-rounded text-sm">remove_circle</i>
            </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${employee._id}')" title="حذف">
                    <i class="material-symbols-rounded text-sm">delete</i>
            </button>
        </td>
      `;
        
        tbody.appendChild(row);
    });
}

// Filter employees based on search and filters
function filterEmployees() {
    const searchTerm = document.getElementById('searchEmployee')?.value.toLowerCase().trim() || '';
    const filterEmployeeType = document.getElementById('filterEmployeeType')?.value || '';
    const filterEmploymentType = document.getElementById('filterEmploymentType')?.value || '';
    
    let filtered = allEmployees.filter(employee => {
        // Search filter - search in all text fields
        const matchesSearch = !searchTerm || 
            (employee.employeeCode && employee.employeeCode.toString().toLowerCase().includes(searchTerm)) ||
            (employee.employeeName && employee.employeeName.toLowerCase().includes(searchTerm)) ||
            (employee.employeePhoneNumber && employee.employeePhoneNumber.toString().includes(searchTerm));
        
        // Employee type filter
        const matchesEmployeeType = !filterEmployeeType || employee.employeeType === filterEmployeeType;
        
        // Employment type filter
        const matchesEmploymentType = !filterEmploymentType || employee.employmentType === filterEmploymentType;
        
        return matchesSearch && matchesEmployeeType && matchesEmploymentType;
    });
    
    renderEmployees(filtered);
}

// Handle add employee form submission
async function handleAddEmployee(e) {
    e.preventDefault();
    
    const spinner = document.getElementById('spinner');
    const submitBtn = document.getElementById('addNewEmployeeBtn');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        spinner.classList.remove('d-none');
        submitBtn.disabled = true;
        closeMessage();
        
        const formData = {
            employeeName: document.getElementById('employeeName').value,
            employeePhoneNumber: document.getElementById('employeePhoneNumber').value,
            employeeType: document.getElementById('employeeType').value,
            employmentType: document.getElementById('employmentType').value,
            employeeSalary: document.getElementById('employeeSalary').value || 0,
            hourlyRate: document.getElementById('hourlyRate').value || 0,
        };
        
        const response = await fetch('/admin/add-employee', {
            method: 'POST',
      headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            successMessage.style.display = 'block';
            successMessage.innerHTML = `تم إضافة الموظف بنجاح. كود الموظف: ${data.employeeCode || 'N/A'}`;
            document.getElementById('addEmployeeForm').reset();
            loadEmployees();
        } else {
            errorMessage.style.display = 'block';
            errorMessage.innerHTML = data.message || 'فشل إضافة الموظف';
        }
    } catch (error) {
        console.error('Error adding employee:', error);
        errorMessage.style.display = 'block';
        errorMessage.innerHTML = 'حدث خطأ أثناء إضافة الموظف';
    } finally {
        spinner.classList.add('d-none');
        submitBtn.disabled = false;
    }
}

function closeMessage() {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
}

// Edit employee
async function editEmployee(id) {
  try {
    const response = await fetch(`/admin/get-employee/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch employee details');
    }

    const employee = await response.json();
        currentEmployeeId = id;
        
        // Populate modal
        document.getElementById('editEmployeeCode').value = employee.employeeCode || 'N/A';
        document.getElementById('editEmployeeName').value = employee.employeeName || '';
        document.getElementById('editEmployeePhone').value = employee.employeePhoneNumber || '';
        document.getElementById('editEmployeeType').value = employee.employeeType || 'other';
        document.getElementById('editEmploymentType').value = employee.employmentType || 'Full-Time';
        document.getElementById('editEmployeeSalary').value = employee.employeeSalary || 0;
        document.getElementById('editHourlyRate').value = employee.hourlyRate || 0;
    document.getElementById('editEmployeeId').value = employee._id;
        
        // Show/hide salary fields based on employment type
        const editSalaryGroup = document.getElementById('editSalaryGroup');
        const editHourlyRateGroup = document.getElementById('editHourlyRateGroup');
        if (employee.employmentType === 'Part-Time') {
            editSalaryGroup.style.display = 'none';
            editHourlyRateGroup.style.display = 'block';
        } else {
            editSalaryGroup.style.display = 'block';
            editHourlyRateGroup.style.display = 'none';
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editEmployeeModal'));
        modal.show();
  } catch (error) {
        console.error('Error fetching employee:', error);
        showNotification('error', 'فشل تحميل بيانات الموظف');
    }
  }

// Handle edit employee
async function handleEditEmployee() {
  const id = document.getElementById('editEmployeeId').value;
    if (!id) return;
    
    try {
        const formData = {
            employeeName: document.getElementById('editEmployeeName').value,
            employeePhoneNumber: document.getElementById('editEmployeePhone').value,
            employeeType: document.getElementById('editEmployeeType').value,
            employmentType: document.getElementById('editEmploymentType').value,
            employeeSalary: document.getElementById('editEmployeeSalary').value || 0,
            hourlyRate: document.getElementById('editHourlyRate').value || 0,
        };
        
    const response = await fetch(`/admin/get-employee/${id}`, {
      method: 'PUT',
      headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const modalElement = document.getElementById('editEmployeeModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
            // Clean up backdrop manually
            setTimeout(() => {
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, 300);
            showNotification('success', 'تم تحديث بيانات الموظف بنجاح');
            loadEmployees();
        } else {
            const data = await response.json();
            showNotification('error', data.error || data.message || 'فشل تحديث بيانات الموظف');
        }
    } catch (error) {
        console.error('Error updating employee:', error);
        showNotification('error', 'حدث خطأ أثناء تحديث بيانات الموظف');
    }
}

// Delete employee
async function deleteEmployee(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    
    try {
        const response = await fetch(`/admin/delete-employee/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('success', 'تم حذف الموظف بنجاح');
            loadEmployees();
        } else {
            showNotification('error', 'فشل حذف الموظف');
        }
  } catch (error) {
        console.error('Error deleting employee:', error);
        showNotification('error', 'حدث خطأ أثناء حذف الموظف');
    }
}

// Add deduction
async function addDeduction(employeeId) {
    currentDeductionEmployeeId = employeeId;
    document.getElementById('deductionEmployeeId').value = employeeId;
    document.getElementById('addDeductionForm').reset();
    
    // Set current month as default (or next month if user prefers)
    const now = new Date();
    // Get current month in YYYY-MM format
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Set to current month by default
    document.getElementById('deductionMonth').value = currentMonth;
    
    // Load employee data for preview
    try {
        const response = await fetch(`/admin/get-employee/${employeeId}`);
        const employee = await response.json();
        
        const baseSalary = employee.employmentType === 'Full-Time' 
            ? (employee.employeeSalary || 0) 
            : 0;
        
        document.getElementById('previewBaseSalary').textContent = formatCurrency(baseSalary);
        
        // Add event listeners for real-time preview
        const deductionAmountInput = document.getElementById('deductionAmount');
        const deductionMonthInput = document.getElementById('deductionMonth');
        
        // Remove existing listeners and add new ones
        const newDeductionAmountInput = deductionAmountInput.cloneNode(true);
        deductionAmountInput.parentNode.replaceChild(newDeductionAmountInput, deductionAmountInput);
        newDeductionAmountInput.addEventListener('input', updateDeductionPreview);
        
        const newDeductionMonthInput = deductionMonthInput.cloneNode(true);
        deductionMonthInput.parentNode.replaceChild(newDeductionMonthInput, deductionMonthInput);
        newDeductionMonthInput.addEventListener('change', updateDeductionPreview);
        
        updateDeductionPreview();
    } catch (error) {
        console.error('Error loading employee:', error);
    }
    
    const modal = new bootstrap.Modal(document.getElementById('addDeductionModal'));
    modal.show();
}

// Update deduction preview
async function updateDeductionPreview() {
    const employeeId = currentDeductionEmployeeId;
    const deductionAmount = parseFloat(document.getElementById('deductionAmount').value) || 0;
    const month = document.getElementById('deductionMonth').value;
    
    if (!employeeId) return;
    
    try {
        const response = await fetch(`/admin/get-employee/${employeeId}`);
        const employee = await response.json();
        
        const baseSalary = employee.employmentType === 'Full-Time' 
            ? (employee.employeeSalary || 0) 
            : 0;
        
        // Get existing deductions for the month
        const deductionsRes = await fetch(`/admin/get-employee-deductions?employeeId=${employeeId}&month=${month}`);
        const existingDeductions = await deductionsRes.json();
        
        let totalExistingDeductions = 0;
        if (existingDeductions && existingDeductions.length > 0) {
            totalExistingDeductions = existingDeductions
                .filter(d => !d.isApplied)
                .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        }
        
        const totalDeductions = totalExistingDeductions + deductionAmount;
        const afterDeduction = Math.max(0, baseSalary - totalDeductions);
        
        // Update preview
        const previewBaseSalaryEl = document.getElementById('previewBaseSalary');
        const previewDeductionAmountEl = document.getElementById('previewDeductionAmount');
        const previewAfterDeductionEl = document.getElementById('previewAfterDeduction');
        
        if (previewBaseSalaryEl) previewBaseSalaryEl.textContent = formatCurrency(baseSalary);
        // Show total deductions (existing + new) in the preview
        if (previewDeductionAmountEl) previewDeductionAmountEl.textContent = formatCurrency(totalDeductions);
        if (previewAfterDeductionEl) previewAfterDeductionEl.textContent = formatCurrency(afterDeduction);
        
        // Show breakdown of deductions if there are existing deductions
        const deductionBreakdownEl = document.getElementById('deductionBreakdown');
        if (deductionBreakdownEl) {
            if (totalExistingDeductions > 0 && deductionAmount > 0) {
                deductionBreakdownEl.textContent = `(موجودة: ${formatCurrency(totalExistingDeductions)} + جديدة: ${formatCurrency(deductionAmount)})`;
                deductionBreakdownEl.style.display = 'block';
            } else if (totalExistingDeductions > 0) {
                deductionBreakdownEl.textContent = `(خصومات موجودة: ${formatCurrency(totalExistingDeductions)})`;
                deductionBreakdownEl.style.display = 'block';
            } else if (deductionAmount > 0) {
                deductionBreakdownEl.textContent = `(خصم جديد: ${formatCurrency(deductionAmount)})`;
                deductionBreakdownEl.style.display = 'block';
            } else {
                deductionBreakdownEl.style.display = 'none';
            }
        }
        
        // Update preview card color
        const previewCard = document.querySelector('#addDeductionModal .card.border-primary');
        if (previewCard && baseSalary > 0) {
            const deductionPercentage = (totalDeductions / baseSalary) * 100;
            if (deductionPercentage > 50) {
                previewCard.style.background = 'linear-gradient(135deg, #ffebee 0%, #ffffff 100%)';
                previewCard.classList.remove('border-primary', 'border-warning');
                previewCard.classList.add('border-danger');
            } else if (deductionPercentage > 0) {
                previewCard.style.background = 'linear-gradient(135deg, #fff3e0 0%, #ffffff 100%)';
                previewCard.classList.remove('border-primary', 'border-danger');
                previewCard.classList.add('border-warning');
            } else {
                previewCard.style.background = 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)';
                previewCard.classList.remove('border-danger', 'border-warning');
                previewCard.classList.add('border-primary');
            }
        }
    } catch (error) {
        console.error('Error updating preview:', error);
    }
}

// Handle add deduction
async function handleAddDeduction() {
    try {
        const formData = {
            employeeId: document.getElementById('deductionEmployeeId').value,
            amount: parseFloat(document.getElementById('deductionAmount').value),
            reason: document.getElementById('deductionReason').value,
            appliedToMonth: document.getElementById('deductionMonth').value,
            notes: document.getElementById('deductionNotes').value || '',
        };
        
        const response = await fetch('/admin/add-employee-deduction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const modalElement = document.getElementById('addDeductionModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
            // Clean up backdrop manually
            setTimeout(() => {
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, 300);
            
            showNotification('success', `تم إضافة الخصم بنجاح. سيتم تطبيقه على راتب شهر ${formData.appliedToMonth}`);
            
            // Refresh salary history if modal is open
            if (currentPaymentEmployeeId) {
                viewSalaryHistory(currentPaymentEmployeeId);
            }
        } else {
            showNotification('error', data.error || 'فشل إضافة الخصم');
        }
    } catch (error) {
        console.error('Error adding deduction:', error);
        showNotification('error', 'حدث خطأ أثناء إضافة الخصم');
    }
}

// View salary history
async function viewSalaryHistory(employeeId) {
    currentPaymentEmployeeId = employeeId;
    
    try {
        const response = await fetch(`/admin/employee-salary-history/${employeeId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch salary history');
        }
        
        const data = await response.json();
        renderSalaryHistory(data);
        
        const modal = new bootstrap.Modal(document.getElementById('viewSalaryHistoryModal'));
        modal.show();
    } catch (error) {
        console.error('Error fetching salary history:', error);
        showNotification('error', 'فشل تحميل سجل الرواتب');
    }
}

// Render salary history
function renderSalaryHistory(data) {
    const { employee, payments, deductions, summary } = data;
    
    // Render summary with enhanced cards
    // Explanation:
    // - totalPaid = sum of totalAmount from all payments (this is net amount after deductions)
    // - totalDeductions = sum of deductions applied in payments
    // - netAmount = totalPaid (because totalAmount already has deductions subtracted)
    const summaryDiv = document.getElementById('salarySummary');
    const totalDeductions = summary.totalDeductions || 0;
    const netAmount = summary.netAmount !== undefined ? summary.netAmount : summary.totalPaid;
    
    summaryDiv.innerHTML = `
        <div class="row g-3">
            <div class="col-md-3">
                <div class="card salary-summary-card total-paid">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="material-symbols-rounded">payments</i>
                        </div>
                        <h6>إجمالي المدفوع</h6>
                        <h4>${formatCurrency(summary.totalPaid)}</h4>
                        <small class="text-muted" style="font-size: 0.75rem;">المبلغ الفعلي المدفوع</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card salary-summary-card total-deductions">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="material-symbols-rounded">remove_circle</i>
                        </div>
                        <h6>إجمالي الخصومات</h6>
                        <h4>${formatCurrency(totalDeductions)}</h4>
                        <small class="text-muted" style="font-size: 0.75rem;">الخصومات المطبقة</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card salary-summary-card total-payments">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="material-symbols-rounded">receipt_long</i>
                        </div>
                        <h6>عدد الدفعات</h6>
                        <h4>${summary.totalPayments}</h4>
                        <small class="text-muted" style="font-size: 0.75rem;">إجمالي عدد الدفعات</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card salary-summary-card net-amount">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="material-symbols-rounded">account_balance_wallet</i>
                        </div>
                        <h6>صافي المبلغ</h6>
                        <h4 class="${netAmount < 0 ? 'text-danger' : ''}">${formatCurrency(netAmount)}</h4>
                        <small class="text-muted" style="font-size: 0.75rem;">المبلغ المستحق</small>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Render payments table
    const tableDiv = document.getElementById('salaryHistoryTable');
    if (payments.length === 0) {
        tableDiv.innerHTML = `
            <div class="empty-salary-state">
                <i class="material-symbols-rounded empty-icon">receipt_long</i>
                <h5>لا توجد دفعات مسجلة</h5>
                <p>لم يتم تسجيل أي دفعات راتب لهذا الموظف بعد</p>
            </div>
        `;
        return;
    }
    
    let tableHTML = `
        <div class="salary-table-wrapper">
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>الشهر</th>
                            <th>تاريخ الدفع</th>
                            <th>الراتب الأساسي</th>
                            <th>المكافآت</th>
                            <th>الإضافات</th>
                            <th>الخصومات</th>
                            <th class="text-end">المبلغ الإجمالي</th>
                            <th>طريقة الدفع</th>
                            <th>دفع بواسطة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    payments.forEach((payment, index) => {
        const rowClass = index % 2 === 0 ? '' : 'table-light';
        tableHTML += `
            <tr class="${rowClass}">
                <td><strong>${payment.paymentMonth}</strong></td>
                <td>${new Date(payment.paymentDate).toLocaleDateString('ar-EG', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</td>
                <td>${formatCurrency(payment.baseSalary)}</td>
                <td><span class="text-success">${formatCurrency(payment.bonuses)}</span></td>
                <td><span class="text-info">${formatCurrency(payment.extras)}</span></td>
                <td><span class="text-danger">${formatCurrency(payment.deductions)}</span></td>
                <td class="text-end"><strong class="text-primary" style="font-size: 1.1rem;">${formatCurrency(payment.totalAmount)}</strong></td>
                <td>
                    <span class="badge bg-secondary">${getPaymentMethodText(payment.paymentMethod)}</span>
                </td>
                <td>${payment.paidBy?.employeeName || 'N/A'}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-warning text-white" onclick="editPayment('${payment._id}')" title="تعديل">
                            <i class="material-symbols-rounded" style="font-size: 18px;">edit</i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deletePayment('${payment._id}')" title="حذف">
                            <i class="material-symbols-rounded" style="font-size: 18px;">delete</i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    tableDiv.innerHTML = tableHTML;
}

// Global variable to track if we're editing
let currentPaymentId = null;

// Open pay salary modal (for adding new payment)
async function openPaySalaryModal() {
    currentPaymentId = null;
    const employeeId = currentPaymentEmployeeId;
    if (!employeeId) return;
    
    // Update modal title
    document.getElementById('paySalaryModalLabel').textContent = 'دفع راتب شهري';
    
    try {
        // Get employee details to populate base salary
        const employeeRes = await fetch(`/admin/get-employee/${employeeId}`);
        const employee = await employeeRes.json();
        
        document.getElementById('paymentEmployeeId').value = employeeId;
        document.getElementById('currentPaymentId').value = '';
        document.getElementById('paySalaryForm').reset();
        
        // Set current month and date
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById('paymentMonth').value = month;
        document.getElementById('paymentDate').value = now.toISOString().split('T')[0];
        
        // Set base salary based on employment type
        if (employee.employmentType === 'Full-Time') {
            document.getElementById('baseSalary').value = employee.employeeSalary || 0;
            document.getElementById('hoursWorkedGroup').style.display = 'none';
        } else {
            document.getElementById('baseSalary').value = 0;
            document.getElementById('hoursWorkedGroup').style.display = 'block';
        }
        
        // Load deductions for the selected month
        await loadDeductionsForMonth(employeeId, month);
        
        // Calculate total amount
        calculateTotalAmount();
        
        const modal = new bootstrap.Modal(document.getElementById('paySalaryModal'));
        modal.show();
        
        // Add event listener for month change with duplicate check
        const paymentMonthInput = document.getElementById('paymentMonth');
        if (paymentMonthInput) {
            // Remove existing listeners and add new one
            const newPaymentMonthInput = paymentMonthInput.cloneNode(true);
            paymentMonthInput.parentNode.replaceChild(newPaymentMonthInput, paymentMonthInput);
            
            newPaymentMonthInput.addEventListener('change', async function() {
                const selectedMonth = this.value;
                if (!selectedMonth) return;
                
                // Check if payment already exists for this month (only when adding new payment)
                const currentPaymentId = document.getElementById('currentPaymentId').value;
                if (!currentPaymentId) {
                    try {
                        const checkResponse = await fetch(`/admin/get-employee-payments?employeeId=${employeeId}&month=${selectedMonth}`);
                        const existingPayments = await checkResponse.json();
                        
                        if (existingPayments && existingPayments.length > 0) {
                            const warningMessage = `تحذير: يوجد بالفعل دفعة راتب لشهر ${selectedMonth}.\n\nإذا قمت بحفظ هذه الدفعة، سيتم رفضها. يرجى تعديل الدفعة الموجودة أو اختيار شهر آخر.`;
                            alert(warningMessage);
                            
                            // Highlight the month input
                            this.style.borderColor = '#dc3545';
                            this.style.borderWidth = '2px';
                            setTimeout(() => {
                                this.style.borderColor = '';
                                this.style.borderWidth = '';
                            }, 3000);
                        }
                    } catch (checkError) {
                        console.error('Error checking existing payments:', checkError);
                    }
                }
                
                await loadDeductionsForMonth(employeeId, selectedMonth);
                calculateTotalAmount();
            });
        }
    } catch (error) {
        console.error('Error fetching employee:', error);
        showNotification('error', 'فشل تحميل بيانات الموظف');
    }
}

// Load deductions for a specific month
async function loadDeductionsForMonth(employeeId, month) {
    try {
        const response = await fetch(`/admin/get-employee-deductions?employeeId=${employeeId}&month=${month}`);
        const deductions = await response.json();
        
        const deductionsList = document.getElementById('appliedDeductionsList');
        const noDeductionsMsg = document.getElementById('noDeductionsMessage');
        const deductionsInput = document.getElementById('deductions');
        
        if (!deductions || deductions.length === 0) {
            if (noDeductionsMsg) {
                noDeductionsMsg.style.display = 'block';
                if (deductionsList) {
                    deductionsList.innerHTML = '';
                    deductionsList.appendChild(noDeductionsMsg);
                }
            }
            if (deductionsInput) deductionsInput.value = 0;
            return;
        }
        
        // Filter only non-applied deductions for the selected month
        const activeDeductions = deductions.filter(d => {
            // Only show deductions that:
            // 1. Are not yet applied (isApplied === false)
            // 2. Match the selected month (appliedToMonth === month)
            return !d.isApplied && d.appliedToMonth === month;
        });
        
        if (activeDeductions.length === 0) {
            if (noDeductionsMsg) {
                noDeductionsMsg.style.display = 'block';
                if (deductionsList) {
                    deductionsList.innerHTML = '';
                    deductionsList.appendChild(noDeductionsMsg);
                }
            }
            if (deductionsInput) deductionsInput.value = 0;
            return;
        }
        
        if (noDeductionsMsg) noDeductionsMsg.style.display = 'none';
        
        // Calculate total deductions accurately
        let totalDeductions = 0;
        let deductionsHTML = '<div class="row g-2">';
        
        activeDeductions.forEach((deduction, index) => {
            const deductionAmount = parseFloat(deduction.amount) || 0;
            totalDeductions += deductionAmount;
            
            deductionsHTML += `
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center p-3 bg-white rounded border border-warning shadow-sm" style="transition: all 0.2s ease;">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                                <i class="material-symbols-rounded text-danger me-2" style="font-size: 22px;">remove_circle</i>
                                <strong class="text-danger fs-5">${formatCurrency(deductionAmount)}</strong>
                            </div>
                            <small class="text-muted d-block mb-1">
                                <i class="material-symbols-rounded" style="font-size: 16px; vertical-align: middle;">description</i>
                                ${deduction.reason || 'لا يوجد سبب'}
                            </small>
                            ${deduction.notes ? `<small class="text-muted d-block"><em>${deduction.notes}</em></small>` : ''}
                        </div>
                        <div class="text-end ms-3">
                            <div class="badge bg-warning text-dark mb-2">
                                <i class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle;">calendar_month</i>
                                ${deduction.appliedToMonth}
                            </div>
                            <div class="text-muted" style="font-size: 0.75rem;">
                                ${new Date(deduction.deductionDate || deduction.createdAt).toLocaleDateString('ar-EG')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        deductionsHTML += '</div>';
        if (deductionsList) deductionsList.innerHTML = deductionsHTML;
        
        // Set the total deductions value with proper precision
        const totalDeductionsValue = parseFloat(totalDeductions.toFixed(2));
        if (deductionsInput) {
            deductionsInput.value = totalDeductionsValue;
            // Trigger input event to recalculate total amount
            deductionsInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
    } catch (error) {
        console.error('Error loading deductions:', error);
        const deductionsInput = document.getElementById('deductions');
        if (deductionsInput) deductionsInput.value = 0;
    }
}

// Edit payment
async function editPayment(paymentId) {
    currentPaymentId = paymentId;
    
    try {
        const response = await fetch(`/admin/get-employee-payment/${paymentId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch payment details');
        }
        
        const payment = await response.json();
        
        // Update modal title
        document.getElementById('paySalaryModalLabel').textContent = 'تعديل دفعة راتب';
        
        // Populate form
        document.getElementById('paymentEmployeeId').value = payment.employee._id || payment.employee;
        document.getElementById('currentPaymentId').value = paymentId;
        document.getElementById('paymentMonth').value = payment.paymentMonth;
        document.getElementById('paymentDate').value = new Date(payment.paymentDate).toISOString().split('T')[0];
        document.getElementById('baseSalary').value = payment.baseSalary || 0;
        document.getElementById('hoursWorked').value = payment.hoursWorked || 0;
        document.getElementById('bonuses').value = payment.bonuses || 0;
        document.getElementById('extras').value = payment.extras || 0;
        document.getElementById('deductions').value = payment.deductions || 0;
        document.getElementById('paymentMethod').value = payment.paymentMethod || 'cash';
        document.getElementById('receiptNumber').value = payment.receiptNumber || '';
        document.getElementById('paymentNotes').value = payment.notes || '';
        
        // Show/hide hours worked based on employee type and load deductions
        const employeeId = payment.employee._id || payment.employee;
        const employeeRes = await fetch(`/admin/get-employee/${employeeId}`);
        const employee = await employeeRes.json();
        
        if (employee.employmentType === 'Part-Time') {
            document.getElementById('hoursWorkedGroup').style.display = 'block';
        } else {
            document.getElementById('hoursWorkedGroup').style.display = 'none';
        }
        
        // Load deductions for the payment month
        await loadDeductionsForMonth(employeeId, payment.paymentMonth);
        
        calculateTotalAmount();
        
        const modal = new bootstrap.Modal(document.getElementById('paySalaryModal'));
        modal.show();
    } catch (error) {
        console.error('Error fetching payment:', error);
        showNotification('error', 'فشل تحميل بيانات الدفعة');
    }
}

// Delete payment
async function deletePayment(paymentId) {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/delete-employee-payment/${paymentId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('success', 'تم حذف الدفعة بنجاح');
            // Refresh salary history
            if (currentPaymentEmployeeId) {
                viewSalaryHistory(currentPaymentEmployeeId);
            }
    } else {
            showNotification('error', data.error || 'فشل حذف الدفعة');
        }
    } catch (error) {
        console.error('Error deleting payment:', error);
        showNotification('error', 'حدث خطأ أثناء حذف الدفعة');
    }
}

// Calculate total amount with professional breakdown
function calculateTotalAmount() {
    const baseSalary = parseFloat(document.getElementById('baseSalary').value) || 0;
    const bonuses = parseFloat(document.getElementById('bonuses').value) || 0;
    const extras = parseFloat(document.getElementById('extras').value) || 0;
    const deductions = parseFloat(document.getElementById('deductions').value) || 0;
    
    // Calculate totals
    const grossAmount = baseSalary + bonuses + extras;
    const total = Math.max(0, grossAmount - deductions); // Ensure non-negative
    
    // Update preview elements if they exist
    const previewBase = document.getElementById('previewBase');
    const previewBonuses = document.getElementById('previewBonuses');
    const previewExtras = document.getElementById('previewExtras');
    const previewDeductions = document.getElementById('previewDeductions');
    const totalAmountPreview = document.getElementById('totalAmountPreview');
    
    if (previewBase) previewBase.textContent = formatCurrency(baseSalary);
    if (previewBonuses) previewBonuses.textContent = formatCurrency(bonuses);
    if (previewExtras) previewExtras.textContent = formatCurrency(extras);
    if (previewDeductions) previewDeductions.textContent = formatCurrency(deductions);
    if (totalAmountPreview) totalAmountPreview.textContent = formatCurrency(total);
    
    // Update preview card color based on result
    const previewCard = document.querySelector('.card.border-primary');
    if (previewCard && baseSalary > 0) {
        const deductionPercentage = (deductions / baseSalary) * 100;
        if (deductionPercentage > 50) {
            previewCard.style.background = 'linear-gradient(135deg, #ffebee 0%, #ffffff 100%)';
            previewCard.classList.remove('border-primary', 'border-warning');
            previewCard.classList.add('border-danger');
        } else if (deductionPercentage > 0) {
            previewCard.style.background = 'linear-gradient(135deg, #fff3e0 0%, #ffffff 100%)';
            previewCard.classList.remove('border-primary', 'border-danger');
            previewCard.classList.add('border-warning');
        } else {
            previewCard.style.background = 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)';
            previewCard.classList.remove('border-danger', 'border-warning');
            previewCard.classList.add('border-primary');
        }
    }
}

// Handle pay salary (add or update)
async function handlePaySalary() {
    try {
        const paymentId = document.getElementById('currentPaymentId').value || currentPaymentId;
        const employeeId = document.getElementById('paymentEmployeeId').value;
        const paymentMonth = document.getElementById('paymentMonth').value;
        
        // Check if payment already exists for this month (only when adding new payment, not editing)
        if (!paymentId) {
            try {
                const checkResponse = await fetch(`/admin/get-employee-payments?employeeId=${employeeId}&month=${paymentMonth}`);
                const existingPayments = await checkResponse.json();
                
                if (existingPayments && existingPayments.length > 0) {
                    const confirmMessage = `يوجد بالفعل دفعة راتب لشهر ${paymentMonth}.\n\nهل تريد تعديل الدفعة الموجودة بدلاً من إضافة دفعة جديدة؟`;
                    if (confirm(confirmMessage)) {
                        // Open edit modal for existing payment
                        editPayment(existingPayments[0]._id);
                        return;
                    } else {
                        showNotification('warning', 'تم إلغاء العملية. يرجى اختيار شهر آخر أو تعديل الدفعة الموجودة.');
                        return;
                    }
                }
            } catch (checkError) {
                console.error('Error checking existing payments:', checkError);
                // Continue with payment creation if check fails
            }
        }
        
        const formData = {
            employeeId: employeeId,
            paymentMonth: paymentMonth,
            paymentDate: document.getElementById('paymentDate').value,
            baseSalary: parseFloat(document.getElementById('baseSalary').value) || 0,
            hoursWorked: parseFloat(document.getElementById('hoursWorked').value) || 0,
            bonuses: parseFloat(document.getElementById('bonuses').value) || 0,
            extras: parseFloat(document.getElementById('extras').value) || 0,
            deductions: parseFloat(document.getElementById('deductions').value) || 0,
            paymentMethod: document.getElementById('paymentMethod').value,
            receiptNumber: document.getElementById('receiptNumber').value || '',
            notes: document.getElementById('paymentNotes').value || '',
        };
        
        let url = '/admin/add-employee-payment';
        let method = 'POST';
        
        // If editing, use update endpoint
        if (paymentId) {
            url = `/admin/update-employee-payment/${paymentId}`;
            method = 'PUT';
            currentPaymentId = paymentId;
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('Error parsing response:', jsonError);
            showNotification('error', 'حدث خطأ في استجابة الخادم. يرجى المحاولة مرة أخرى.');
            return;
        }
        
        if (response.ok) {
            const modalElement = document.getElementById('paySalaryModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
            // Clean up backdrop manually
            setTimeout(() => {
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, 300);
            showNotification('success', currentPaymentId ? 'تم تحديث الدفعة بنجاح' : 'تم تسجيل الدفعة بنجاح');
            currentPaymentId = null;
            viewSalaryHistory(formData.employeeId); // Refresh history
        } else {
            // Handle duplicate payment error
            const errorMessage = data.message || data.error || (currentPaymentId ? 'فشل تحديث الدفعة' : 'فشل تسجيل الدفعة');
            
            console.log('Payment error response:', {
                status: response.status,
                statusText: response.statusText,
                data: data,
                errorMessage: errorMessage
            });
            
            // Always show error notification first
            showNotification('error', errorMessage);
            
            // If duplicate payment error, offer to edit existing payment
            if (data.existingPaymentId && !paymentId) {
                // Wait a bit for notification to show, then show confirm dialog
                setTimeout(() => {
                    const confirmMessage = `تم إضافة راتب لهذا الشهر مسبقاً.\n\n${errorMessage}\n\nهل تريد تعديل الدفعة الموجودة؟`;
                    if (confirm(confirmMessage)) {
                        editPayment(data.existingPaymentId);
                    }
                }, 500);
            } else {
                // Log error details for debugging
                console.error('Payment error:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                });
            }
        }
    } catch (error) {
        console.error('Error saving payment:', error);
        showNotification('error', 'حدث خطأ أثناء حفظ الدفعة');
    }
}

// Helper functions
function getPaymentMethodText(method) {
    const methods = {
        'cash': 'نقدي',
        'bank_transfer': 'تحويل بنكي',
        'check': 'شيك',
        'other': 'أخرى'
    };
    return methods[method] || method;
}

// Show notification with improved visibility
function showNotification(type, message) {
    if (!message || message.trim() === '') {
        console.warn('showNotification called with empty message');
        return;
    }
    
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8',
    };
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
    };
    
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.setAttribute('data-notification-type', type);
    notification.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        background-color: ${colors[type] || colors.info} !important;
        color: white !important;
        padding: 15px 25px !important;
        border-radius: 8px !important;
        z-index: 99999 !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        max-width: 450px !important;
        min-width: 300px !important;
        font-size: 16px !important;
        font-weight: 500 !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        animation: slideInRight 0.3s ease-out !important;
        direction: rtl !important;
    `;
    
    // Add icon
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size: 20px; font-weight: bold;';
    iconSpan.textContent = icons[type] || icons.info;
    notification.appendChild(iconSpan);
    
    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    messageSpan.style.flex = '1';
    notification.appendChild(messageSpan);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        margin-right: auto;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.8;
        line-height: 1;
    `;
    closeBtn.onclick = () => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    };
    closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
    closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';
    notification.appendChild(closeBtn);
    
    document.body.appendChild(notification);
    
    // Auto remove after duration (longer for errors)
    const duration = type === 'error' ? 7000 : type === 'warning' ? 6000 : 5000;
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, duration);
    
    // Add CSS animations if not already added
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}
