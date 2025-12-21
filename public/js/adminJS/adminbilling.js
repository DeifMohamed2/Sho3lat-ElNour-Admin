// Combined Billing/Invoice Management System
let allInvoices = [];

// Old bill form elements
const addNewBillForm = document.getElementById('addNewBillForm');
const spinner = document.getElementById('spinner');
const spinner2 = document.getElementById('spinner2');
const successToast = document.getElementById('successToast');
const errorMessage = document.getElementById('errorMessage');
const allBills = document.getElementById('allBills');

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    if (document.getElementById('filterStartDate')) {
        document.getElementById('filterStartDate').value = firstDay.toISOString().split('T')[0];
        document.getElementById('filterEndDate').value = lastDay.toISOString().split('T')[0];
    }
    
    // Event listeners for new invoice system
    const saveInvoiceBtn = document.getElementById('saveInvoiceBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const categorySelect = document.getElementById('category');
    
    if (saveInvoiceBtn) {
        saveInvoiceBtn.addEventListener('click', createInvoice);
    }
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', loadInvoices);
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            updateRelatedFields();
            updateInvoiceType();
        });
    }
    
    // Load initial data
    if (document.getElementById('invoicesTableBody')) {
        loadInvoices();
        loadSummary();
    }
    
    // Old bill form
    if (addNewBillForm) {
        addNewBillForm.addEventListener('submit', addNewBill);
    }
    
    // Load old bills
    if (allBills) {
        loadOldBills();
    }
});

// Upload photo to Cloudinary
async function uploadPhoto(photoFile) {
  const formData = new FormData();
  formData.append('file', photoFile);
  formData.append('upload_preset', 'Elkably');
  formData.append('cloud_name', 'dusod9wxt');

  const response = await fetch(
    'https://api.cloudinary.com/v1_1/dusod9wxt/image/upload',
    {
      method: 'POST',
      body: formData,
    }
  );

  if (response.ok) {
    const data = await response.json();
    return data.secure_url;
  } else {
    throw new Error('Photo upload failed');
  }
}

// Add a new bill (old system)
async function addNewBill(event) {
  event.preventDefault();

  if (!spinner || !successToast || !errorMessage) return;

  spinner.classList.remove('d-none');
  successToast.classList.remove('show');
  errorMessage.classList.remove('show');

  const formData = new FormData(addNewBillForm);
  const billPhoto = formData.get('billPhoto');

  let photoUrl = '';
  try {
    if (billPhoto && billPhoto.size > 0) {
      photoUrl = await uploadPhoto(billPhoto);
    }

    const data = {
      billName: formData.get('billName'),
      billAmount: formData.get('billAmount'),
      billNote: formData.get('billNote'),
      billCategory: formData.get('billCategory'),
      employeeId: formData.get('employeeId'),
      billPhoto: photoUrl,
    };

    const response = await fetch('/admin/Admin-add-bill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();
    spinner.classList.add('d-none');

    if (response.ok) {
      addNewBillForm.reset();
      successToast.classList.add('show');
      setTimeout(() => {
        successToast.classList.remove('show');
      }, 4000);
      loadOldBills();
    } else {
      errorMessage.querySelector('.toast-body').textContent =
        responseData.message || 'An error occurred.';
      errorMessage.classList.add('show');
      setTimeout(() => errorMessage.classList.remove('show'), 5000);
    }
  } catch (error) {
    console.error('Error adding bill:', error);
    spinner.classList.add('d-none');
    errorMessage.querySelector('.toast-body').textContent =
      'Network error. Please try again.';
    errorMessage.classList.add('show');
    setTimeout(() => errorMessage.classList.remove('show'), 5000);
  }
}

// Handle category change to show/hide employee selection
const billCategorySelect = document.getElementById('billCategory');
if (billCategorySelect) {
    billCategorySelect.addEventListener('change', function() {
  const employeeSelection = document.getElementById('employeeSelection');
      if (this.value === 'salaries' && employeeSelection) {
    employeeSelection.style.display = 'block';
    loadEmployees();
      } else if (employeeSelection) {
    employeeSelection.style.display = 'none';
  }
});
}

// Load employees for salary selection
async function loadEmployees() {
  try {
    const response = await fetch('/admin/all-employee');
    if (response.ok) {
      const employees = await response.json();
      const employeeSelect = document.getElementById('employeeId');
      if (employeeSelect) {
      employeeSelect.innerHTML = '<option value="">Select Employee</option>';
      
      employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee._id;
        option.textContent = employee.employeeName;
        employeeSelect.appendChild(option);
      });
      }
    }
  } catch (error) {
    console.error('Error loading employees:', error);
  }
}

// Get ALL Billings (old system)
function populateBills(bills) {
    if (!allBills) return;
    
    const categoryNames = {
      salaries: 'الرواتب',
      canteen_in: 'إيرادات المقصف',
      canteen_out: 'مقصف (خارج)',
      government_fees: 'رسوم حكومية',
      electric_invoices: 'فواتير الكهرباء',
      equipments: 'المعدات والأجهزة',
      other: 'أخرى'
    };

    bills.forEach((bill) => {
      const billItem = document.createElement('li');
      billItem.className = 'list-group-item border-0 d-flex p-4 mb-2 bg-gray-100 border-radius-lg';

      billItem.innerHTML = `
        <div class="d-flex flex-column">
          <h6 class="mb-3 text-sm">تاريخ : ${new Date(bill.createdAt).toLocaleDateString()} ${new Date(bill.createdAt).toLocaleTimeString()}</h6>
          <span class="mb-2 text-dark SpanTitle">اسم المنتج : <span class="text-dark font-weight-bold me-sm-2">${bill.billName || bill.description || 'N/A'}</span></span>
          <span class="mb-2 text-dark SpanTitle">الفئة : <span class="text-dark font-weight-bold me-sm-2">${categoryNames[bill.billCategory] || getCategoryLabel(bill.category) || 'غير محدد'}</span></span>
          <span class="mb-2 text-dark SpanTitle">سعر الشراء : <span class="text-dark font-weight-bold me-sm-2">${bill.billAmount || bill.amount || 0} ج.م</span></span>
          <span class="text-dark SpanTitle">ملاحظات : <span class="text-dark font-weight-bold me-sm-2">${bill.billNote || bill.notes || ''}</span></span>
          <span><button class="billingPhotoBtn" data-photo-url="${bill.billPhoto || ''}"> ${bill.billPhoto ? 'مشاهده الصوره':'لا يوجد صوره'} </button></span>
        </div>
            `;

      allBills.appendChild(billItem);

      const billingPhotoBtn = billItem.querySelector('.billingPhotoBtn');
      if (billingPhotoBtn) {
      billingPhotoBtn.addEventListener('click', () => {
        const photoUrl = billingPhotoBtn.getAttribute('data-photo-url');
        if (photoUrl) { 
          window.open(photoUrl, '_blank');
        }
      });
      }
    });
}

// Load old bills
async function loadOldBills() {
  try {
    if (!spinner2 || !allBills) return;
    
    spinner2.classList.remove('d-none');
    const response = await fetch('/admin/Admin-get-all-bills');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    allBills.innerHTML = '';
    const Bills = await response.json();
    populateBills(Bills);
    spinner2.classList.add('d-none');
  } catch (error) {
    console.error(error);
    if (spinner2) spinner2.classList.add('d-none');
  }
}

// ========== NEW INVOICE SYSTEM FUNCTIONS ==========

// Update invoice type based on category selection
function updateInvoiceType() {
    const categorySelect = document.getElementById('category');
    const invoiceTypeInput = document.getElementById('invoiceType');
    
    if (!categorySelect || !invoiceTypeInput) return;
    
    const selectedOption = categorySelect.options[categorySelect.selectedIndex];
    const invoiceType = selectedOption.getAttribute('data-type');
    
    if (invoiceType) {
        invoiceTypeInput.value = invoiceType;
    } else {
        invoiceTypeInput.value = '';
    }
}

// Update related fields based on category
function updateRelatedFields() {
    const category = document.getElementById('category')?.value;
    if (!category) return;
    
    // Hide all related fields
    const studentDiv = document.getElementById('studentSelectDiv');
    const teacherDiv = document.getElementById('teacherSelectDiv');
    const employeeDiv = document.getElementById('employeeSelectDiv');
    
    if (studentDiv) studentDiv.style.display = 'none';
    if (teacherDiv) teacherDiv.style.display = 'none';
    if (employeeDiv) employeeDiv.style.display = 'none';
}

// Create new invoice
async function createInvoice() {
    const form = document.getElementById('createInvoiceForm');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    try {
        const billPhoto = document.getElementById('billPhoto')?.files[0];
        let photoUrl = '';
        
        if (billPhoto && billPhoto.size > 0) {
            photoUrl = await uploadPhoto(billPhoto);
        }
        
        const formData = {
            invoiceType: document.getElementById('invoiceType').value,
            category: document.getElementById('category').value,
            description: document.getElementById('description').value,
            amount: parseFloat(document.getElementById('amount').value),
            paymentMethod: document.getElementById('paymentMethod').value,
            notes: document.getElementById('notes').value,
            billPhoto: photoUrl,
        };
        
        const response = await fetch('/admin/create-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', `تم إنشاء الفاتورة بنجاح. رقم الفاتورة: ${data.invoice.invoiceNumber}`);
            
            form.reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('createInvoiceModal'));
            if (modal) modal.hide();
            
            loadInvoices();
            loadSummary();
            loadOldBills();
        } else {
            showNotification('error', data.error || 'فشل إنشاء الفاتورة');
        }
    } catch (error) {
        console.error('Error creating invoice:', error);
        showNotification('error', 'حدث خطأ أثناء إنشاء الفاتورة');
    }
}

// Load invoices with filters
async function loadInvoices() {
    try {
        const params = new URLSearchParams();
        
        const invoiceType = document.getElementById('filterType')?.value;
        const category = document.getElementById('filterCategory')?.value;
        const startDate = document.getElementById('filterStartDate')?.value;
        const endDate = document.getElementById('filterEndDate')?.value;
        
        if (invoiceType) params.append('invoiceType', invoiceType);
        if (category) params.append('category', category);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const response = await fetch(`/admin/get-invoices?${params.toString()}`);
        const data = await response.json();
        
        if (data.success) {
            allInvoices = data.invoices || [];
            renderInvoices();
        } else {
            showNotification('error', 'فشل تحميل الفواتير');
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
        showNotification('error', 'حدث خطأ أثناء تحميل البيانات');
    }
}

// Render invoices table
function renderInvoices() {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!allInvoices || allInvoices.length === 0) {
        const noInvoicesMsg = document.getElementById('noInvoicesMessage');
        if (noInvoicesMsg) noInvoicesMsg.style.display = 'block';
        return;
    }
    
    const noInvoicesMsg = document.getElementById('noInvoicesMessage');
    if (noInvoicesMsg) noInvoicesMsg.style.display = 'none';
    
    // Sort invoices by date (newest first)
    allInvoices.sort((a, b) => {
        const dateA = new Date(a.invoiceDate || a.createdAt);
        const dateB = new Date(b.invoiceDate || b.createdAt);
        return dateB - dateA; // Descending order (newest first)
    });
    
    allInvoices.forEach(invoice => {
        const row = document.createElement('tr');
        const typeClass = invoice.invoiceType === 'IN' ? 'text-success' : 'text-danger';
        const typeText = invoice.invoiceType === 'IN' ? 'وارد' : 'صادر';
        const invoiceDate = invoice.invoiceDate || invoice.createdAt;
        const date = new Date(invoiceDate).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        row.innerHTML = `
            <td class="text-center"><strong>${invoice.invoiceNumber || 'N/A'}</strong></td>
            <td class="text-center"><span class="badge ${typeClass === 'text-success' ? 'bg-success' : 'bg-danger'} px-3 py-2">${typeText}</span></td>
            <td class="text-center"><span class="badge bg-secondary">${getCategoryLabel(invoice.category)}</span></td>
            <td>${invoice.description}</td>
            <td class="text-center ${typeClass} fw-bold fs-6">${invoice.amount.toFixed(2)} ج.م</td>
            <td class="text-center">${date}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-info me-1" onclick="viewInvoice('${invoice._id}')" title="عرض التفاصيل">
                    <i class="material-symbols-rounded text-sm">visibility</i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteInvoice('${invoice._id}')" title="حذف">
                    <i class="material-symbols-rounded text-sm">delete</i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Get category label in Arabic
function getCategoryLabel(category) {
    const labels = {
        // IN Categories (إيرادات)
        registration_fees: 'رسوم التسجيل',
        book_sales: 'مبيعات الكتب',
        canteen_income: 'إيرادات المقصف',
        other_income: 'إيرادات أخرى',
        
        // OUT Categories (مصروفات)
        rent: 'إيجار',
        utilities: 'مرافق عامة',
        electric: 'كهرباء',
        water: 'مياه',
        internet: 'إنترنت',
        phone: 'هاتف',
        maintenance: 'صيانة',
        supplies: 'لوازم مكتبية',
        equipment: 'معدات',
        transportation: 'مواصلات',
        food: 'طعام',
        cleaning: 'نظافة',
        security: 'أمن',
        marketing: 'تسويق',
        printing: 'طباعة',
        stationery: 'قرطاسية',
        bank_fees: 'رسوم بنكية',
        government_fees: 'رسوم حكومية',
        other_expense: 'مصروفات أخرى',
        
        // Legacy
        salaries: 'الرواتب',
        canteen_in: 'إيرادات المقصف',
        canteen_out: 'مقصف (خارج)',
        electric_invoices: 'فواتير الكهرباء',
        equipments: 'المعدات والأجهزة',
        other: 'أخرى'
    };
    return labels[category] || category;
}

// Load summary statistics
async function loadSummary() {
    try {
        const startDate = document.getElementById('filterStartDate')?.value;
        const endDate = document.getElementById('filterEndDate')?.value;
        
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const response = await fetch(`/admin/invoice-summary?${params.toString()}`);
        const data = await response.json();
        
        if (data.success) {
            const summary = data.summary;
            
            const totalIncomeEl = document.getElementById('totalIncome');
            const totalExpensesEl = document.getElementById('totalExpenses');
            const netBalanceEl = document.getElementById('netBalance');
            const totalInvoicesEl = document.getElementById('totalInvoices');
            const inCountEl = document.getElementById('inCount');
            const outCountEl = document.getElementById('outCount');
            
            // Format currency values
            const formatCurrency = (amount) => {
                return new Intl.NumberFormat('ar-EG', {
                    style: 'currency',
                    currency: 'EGP',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(amount || 0);
            };
            
            if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(summary.totalIncome);
            if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(summary.totalExpenses);
            if (netBalanceEl) netBalanceEl.textContent = formatCurrency(summary.netBalance);
            if (totalInvoicesEl) totalInvoicesEl.textContent = summary.inCount + summary.outCount;
            if (inCountEl) inCountEl.textContent = summary.inCount + ' فاتورة';
            if (outCountEl) outCountEl.textContent = summary.outCount + ' فاتورة';
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// View invoice details
async function viewInvoice(invoiceId) {
    try {
        const response = await fetch(`/admin/get-invoice/${invoiceId}`);
        const data = await response.json();
        
        if (data.success) {
            const invoice = data.invoice;
            const typeText = invoice.invoiceType === 'IN' ? 'وارد' : 'صادر';
            const date = new Date(invoice.invoiceDate).toLocaleDateString('ar-EG');
            
            alert(`رقم الفاتورة: ${invoice.invoiceNumber}\nالنوع: ${typeText}\nالتصنيف: ${getCategoryLabel(invoice.category)}\nالمبلغ: ${invoice.amount.toFixed(2)} ج.م\nالتاريخ: ${date}\nالوصف: ${invoice.description}`);
        }
    } catch (error) {
        console.error('Error loading invoice:', error);
        showNotification('error', 'حدث خطأ أثناء تحميل تفاصيل الفاتورة');
    }
}

// Delete invoice
async function deleteInvoice(invoiceId) {
    if (!confirm('هل أنت متأكد من إلغاء هذه الفاتورة؟ سيتم تصفير المبلغ ووضع علامة الإلغاء.')) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/delete-invoice/${invoiceId}`, {
            method: 'DELETE',
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', 'تم إلغاء الفاتورة بنجاح');
            loadInvoices();
            loadSummary();
            loadOldBills();
        } else {
            showNotification('error', data.error || 'فشل إلغاء الفاتورة');
        }
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showNotification('error', 'حدث خطأ أثناء إلغاء الفاتورة');
    }
}

// Clear filters
function clearFilters() {
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    const filterStartDate = document.getElementById('filterStartDate');
    const filterEndDate = document.getElementById('filterEndDate');
    
    if (filterType) filterType.value = '';
    if (filterCategory) filterCategory.value = '';
    
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    if (filterStartDate) filterStartDate.value = firstDay.toISOString().split('T')[0];
    if (filterEndDate) filterEndDate.value = lastDay.toISOString().split('T')[0];
    
    loadInvoices();
    loadSummary();
}

// Show notification
function showNotification(type, message) {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8',
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${colors[type]};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        max-width: 400px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}
