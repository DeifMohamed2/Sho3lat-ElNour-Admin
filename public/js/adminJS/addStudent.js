// Student Management - School-based System
let allStudents = [];

// Global variables for modals
let currentDeleteStudentId = null;
let currentSendCodeStudentId = null;
let currentPaymentStudentId = null;
let currentPaymentId = null;

// Load students on page load
document.addEventListener('DOMContentLoaded', function() {
    loadStudents();
    
    // Add student form submission
    document.getElementById('addStudentForm').addEventListener('submit', handleAddStudent);
    
    // Search functionality
    document.getElementById('searchStudent').addEventListener('input', applyFilters);
    
    // Filter functionality
    document.getElementById('filterClass').addEventListener('change', applyFilters);
    document.getElementById('filterGender').addEventListener('change', applyFilters);
    document.getElementById('filterPayment').addEventListener('change', applyFilters);
    
    // Clear filters button
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
    
    // Edit student save button
    document.getElementById('saveEditStudentBtn').addEventListener('click', handleEditStudent);
    
    // Delete confirmation button
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteStudent);
    
    // Send code confirmation button
    document.getElementById('confirmSendCodeBtn').addEventListener('click', confirmSendCode);
    
    // Payment management buttons
    document.getElementById('addPaymentBtn').addEventListener('click', openAddPaymentModal);
    document.getElementById('savePaymentBtn').addEventListener('click', savePayment);
});

// Load all students
async function loadStudents() {
    try {
        const response = await fetch('/admin/search-student');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle both old format (array) and new format (object with success)
        if (Array.isArray(data)) {
            // Old format - direct array
            allStudents = data || [];
            renderStudents(allStudents);
        } else if (data.success) {
            // New format - object with success flag
            allStudents = data.students || [];
            renderStudents(allStudents);
        } else {
            // Error response
            console.error('Error response:', data);
            allStudents = [];
            renderStudents([]);
            showNotification('error', data.error || data.message || 'فشل تحميل قائمة الطلاب');
        }
    } catch (error) {
        console.error('Error loading students:', error);
        allStudents = [];
        renderStudents([]);
        showNotification('error', 'حدث خطأ أثناء تحميل القائمة');
    }
}

// Render students table
function renderStudents(students) {
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '';
    
    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">لا توجد بيانات طلاب</td></tr>';
        return;
    }
    
    students.forEach(student => {
        const row = document.createElement('tr');
        const classInfo = student.class ? `${student.class.academicLevel} - ${student.class.section}` : 'غير محدد';
        
        row.innerHTML = `
            <td class="text-center">${student.studentCode || 'N/A'}</td>
            <td class="text-center">${student.studentName || ''}</td>
            <td class="text-center">${classInfo}</td>
            <td class="text-center">${student.parentPhone1 || ''}</td>
            <td class="text-center">${student.totalSchoolFees || 0} ج.م</td>
            <td class="text-center">${student.totalPaid || 0} ج.م</td>
            <td class="text-center">${student.remainingBalance || 0} ج.م</td>
            <td class="text-center">
                <button class="btn btn-sm edit-student-btn" onclick="editStudent('${student._id}')">
                    <i class="material-symbols-rounded text-sm">edit</i>
                </button>
                <button class="btn btn-sm delete-student-btn" onclick="deleteStudent('${student._id}')">
                    <i class="material-symbols-rounded text-sm">delete</i>
                </button>
                <button class="btn btn-sm view-payments-btn" onclick="viewPayments('${student._id}')">
                    <i class="material-symbols-rounded text-sm">payments</i>
                </button>
                <button class="btn btn-sm send-code-btn" onclick="sendCode('${student._id}')">
                    <i class="material-symbols-rounded text-sm">send</i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Handle add student form submission
async function handleAddStudent(e) {
    e.preventDefault();
    
    const spinner = document.getElementById('spinner');
    const submitBtn = document.getElementById('addNewStudentBtn');
    
    try {
        spinner.classList.remove('d-none');
        submitBtn.disabled = true;
        
        const formData = {
            studentName: document.getElementById('studentName').value,
            studentGender: document.getElementById('studentGender').value,
            classId: document.getElementById('classId').value,
            parentName: document.getElementById('parentName').value,
            parentPhone1: document.getElementById('parentPhone1').value,
            parentPhone2: document.getElementById('parentPhone2').value || '',
            totalSchoolFees: parseFloat(document.getElementById('totalSchoolFees').value)
        };
        
        const response = await fetch('/admin/add-student', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', `تم إضافة الطالب بنجاح. كود الطالب: ${data.student.studentCode}`);
            document.getElementById('addStudentForm').reset();
            loadStudents();
        } else {
            showNotification('error', data.message || 'فشل إضافة الطالب');
        }
    } catch (error) {
        console.error('Error adding student:', error);
        showNotification('error', 'حدث خطأ أثناء إضافة الطالب');
    } finally {
        spinner.classList.add('d-none');
        submitBtn.disabled = false;
    }
}

// Helper function to show Bootstrap Modal
function showBootstrapModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
        console.error('Modal element not found:', modalId);
        showNotification('error', 'عنصر النافذة المنبثقة غير موجود');
        return;
    }
    
    // Try Bootstrap first
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        try {
            // Get existing instance or create new one
            let modal = bootstrap.Modal.getInstance(modalElement);
            if (!modal) {
                modal = new bootstrap.Modal(modalElement, {
                    backdrop: true,
                    keyboard: true,
                    focus: true
                });
            }
            modal.show();
            return;
        } catch (e) {
            console.error('Error creating Bootstrap modal:', e);
        }
    }
    
    // Fallback: manually show modal (works even without Bootstrap JS)
    console.log('Using fallback modal display for:', modalId);
    modalElement.style.display = 'block';
    modalElement.classList.add('show');
    modalElement.setAttribute('aria-hidden', 'false');
    modalElement.setAttribute('aria-modal', 'true');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0px';
    
    // Remove existing backdrop if any
    let existingBackdrop = document.getElementById('modalBackdrop');
    if (existingBackdrop) existingBackdrop.remove();
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = 'modalBackdrop';
    backdrop.style.zIndex = '1040';
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '100%';
    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    document.body.appendChild(backdrop);
    
    // Close on backdrop click
    backdrop.addEventListener('click', function() {
        hideBootstrapModal(modalId);
    });
    
    // Set modal z-index
    modalElement.style.zIndex = '1050';
    modalElement.style.display = 'block';
}

// Helper function to hide Bootstrap Modal
function hideBootstrapModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
        console.error('Modal element not found:', modalId);
        return;
    }
    
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        try {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
                return;
            }
        } catch (e) {
            console.error('Error hiding Bootstrap modal:', e);
        }
    }
    
    // Fallback: manually hide modal
    modalElement.classList.remove('show');
    modalElement.style.display = 'none';
    modalElement.setAttribute('aria-hidden', 'true');
    modalElement.setAttribute('aria-modal', 'false');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Remove backdrop
    const backdrop = document.getElementById('modalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('show');
        setTimeout(() => {
            if (backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
        }, 150);
    }
}

// Edit student
async function editStudent(studentId) {
    try {
        const response = await fetch(`/admin/get-student/${studentId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.student) {
            const student = data.student;
            
            document.getElementById('editStudentId').value = student._id;
            document.getElementById('editStudentName').value = student.studentName || '';
            document.getElementById('editStudentCode').value = student.studentCode || '';
            document.getElementById('editStudentGender').value = student.studentGender || 'ذكر';
            document.getElementById('editClassId').value = student.class && student.class._id ? student.class._id : '';
            document.getElementById('editParentName').value = student.parentName || '';
            document.getElementById('editParentPhone1').value = student.parentPhone1 || '';
            document.getElementById('editParentPhone2').value = student.parentPhone2 || '';
            document.getElementById('editTotalSchoolFees').value = student.totalSchoolFees || 0;
            document.getElementById('editAddress').value = student.address || '';
            document.getElementById('editNotes').value = student.notes || '';
            
            showBootstrapModal('editStudentModal');
        } else {
            showNotification('error', data.error || 'فشل تحميل بيانات الطالب');
        }
    } catch (error) {
        console.error('Error loading student:', error);
        showNotification('error', 'حدث خطأ أثناء تحميل البيانات');
    }
}

// Handle edit student save
async function handleEditStudent() {
    const studentId = document.getElementById('editStudentId').value;
    
    if (!studentId) {
        showNotification('error', 'معرف الطالب غير موجود');
        return;
    }
    
    try {
        const formData = {
            studentName: document.getElementById('editStudentName').value,
            studentGender: document.getElementById('editStudentGender').value,
            classId: document.getElementById('editClassId').value,
            parentName: document.getElementById('editParentName').value,
            parentPhone1: document.getElementById('editParentPhone1').value,
            parentPhone2: document.getElementById('editParentPhone2').value || '',
            totalSchoolFees: parseFloat(document.getElementById('editTotalSchoolFees').value),
            address: document.getElementById('editAddress').value || '',
            notes: document.getElementById('editNotes').value || ''
        };
        
        const response = await fetch(`/admin/update-student/${studentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('success', data.message || 'تم تحديث بيانات الطالب بنجاح');
            hideBootstrapModal('editStudentModal');
            loadStudents();
        } else {
            showNotification('error', data.message || 'فشل تحديث البيانات');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        showNotification('error', 'حدث خطأ أثناء تحديث البيانات');
    }
}

// Delete student - show confirmation modal
function deleteStudent(studentId) {
    const student = allStudents.find(s => s._id === studentId);
    if (!student) {
        showNotification('error', 'الطالب غير موجود');
        return;
    }
    
    currentDeleteStudentId = studentId;
    document.getElementById('deleteStudentName').textContent = student.studentName || 'هذا الطالب';
    
    showBootstrapModal('deleteStudentModal');
}

// Confirm delete student
async function confirmDeleteStudent() {
    if (!currentDeleteStudentId) return;
    
    const studentId = currentDeleteStudentId;
    currentDeleteStudentId = null;
    
    try {
        const response = await fetch(`/admin/delete-student/${studentId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('success', data.message || 'تم حذف الطالب بنجاح');
            hideBootstrapModal('deleteStudentModal');
            loadStudents();
        } else {
            showNotification('error', data.message || 'فشل حذف الطالب');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showNotification('error', 'حدث خطأ أثناء حذف الطالب');
    }
}

// View student payments
async function viewPayments(studentId) {
    try {
        currentPaymentStudentId = studentId;
        
        const response = await fetch(`/admin/get-student-payments?studentId=${studentId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            showNotification('error', data.message || 'فشل تحميل المدفوعات');
            return;
        }
        
            const payments = data.payments || [];
        const studentInfo = data.student || {};
        
        // Calculate totals
        const totalPaid = studentInfo.totalPaid || 0;
        const totalFees = studentInfo.totalSchoolFees || 0;
        const remaining = studentInfo.remainingBalance || (totalFees - totalPaid);
        
        // Display summary with enhanced design
        const summaryDiv = document.getElementById('paymentsSummary');
        summaryDiv.innerHTML = `
            <div class="row g-4">
                <div class="col-md-3">
                    <div class="payment-summary-card" style="border-top-color: #007bff;">
                        <div class="card-body text-center">
                            <div class="icon-wrapper" style="background: rgba(0, 123, 255, 0.1);">
                                <i class="material-symbols-rounded text-primary" style="font-size: 2.5rem;">account_balance</i>
                            </div>
                            <h6>إجمالي المصروفات</h6>
                            <h4 class="text-primary">${totalFees.toFixed(2)} ج.م</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="payment-summary-card" style="border-top-color: #28a745;">
                        <div class="card-body text-center">
                            <div class="icon-wrapper" style="background: rgba(40, 167, 69, 0.1);">
                                <i class="material-symbols-rounded text-success" style="font-size: 2.5rem;">check_circle</i>
                            </div>
                            <h6>المدفوع</h6>
                            <h4 class="text-success">${totalPaid.toFixed(2)} ج.م</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="payment-summary-card" style="border-top-color: #dc3545;">
                        <div class="card-body text-center">
                            <div class="icon-wrapper" style="background: rgba(220, 53, 69, 0.1);">
                                <i class="material-symbols-rounded text-danger" style="font-size: 2.5rem;">pending</i>
                            </div>
                            <h6>المتبقي</h6>
                            <h4 class="text-danger">${remaining.toFixed(2)} ج.م</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="payment-summary-card" style="border-top-color: #17a2b8;">
                        <div class="card-body text-center">
                            <div class="icon-wrapper" style="background: rgba(23, 162, 184, 0.1);">
                                <i class="material-symbols-rounded text-info" style="font-size: 2.5rem;">receipt_long</i>
                            </div>
                            <h6>عدد المدفوعات</h6>
                            <h4 class="text-info">${payments.length}</h4>
                        </div>
                    </div>
                </div>
            </div>
        `;
            
        // Display payments table with edit/delete buttons
        const historyDiv = document.getElementById('paymentsHistory');
        if (payments.length === 0) {
            historyDiv.innerHTML = `
                <div class="empty-payments-state">
                    <i class="material-symbols-rounded">receipt_long</i>
                    <p class="mb-3">لا توجد مدفوعات حتى الآن</p>
                    <p class="text-muted">قم بإضافة دفعة جديدة باستخدام الزر أعلاه</p>
                </div>
            `;
        } else {
            let tableHTML = `
                <div class="payments-table-wrapper">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th class="text-center">#</th>
                                    <th class="text-center">التاريخ</th>
                                    <th class="text-center">المبلغ</th>
                                    <th class="text-center">طريقة الدفع</th>
                                    <th class="text-center">رقم الإيصال</th>
                                    <th class="text-center">الملاحظات</th>
                                    <th class="text-center">المستلم</th>
                                    <th class="text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            payments.forEach((payment, index) => {
                const date = payment.paymentDate 
                    ? new Date(payment.paymentDate).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : '-';
                const employeeName = payment.receivedBy && payment.receivedBy.employeeName 
                    ? payment.receivedBy.employeeName 
                    : 'N/A';
                const amount = payment.amount || 0;
                const method = getPaymentMethodArabic(payment.paymentMethod || 'cash');
                const methodIcon = getPaymentMethodIcon(payment.paymentMethod || 'cash');
                const notes = payment.notes || '-';
                const receiptNumber = payment.receiptNumber || '-';
                // Get payment ID - handle both string and object _id
                let paymentId = '';
                if (payment._id) {
                    paymentId = typeof payment._id === 'string' ? payment._id : payment._id.toString();
                } else if (payment.id) {
                    paymentId = typeof payment.id === 'string' ? payment.id : payment.id.toString();
                }
                
                tableHTML += `
                    <tr>
                        <td class="text-center fw-bold" style="color: #666;">${index + 1}</td>
                        <td class="text-center">
                            <div class="d-flex flex-column">
                                <span class="fw-semibold">${date}</span>
                            </div>
                        </td>
                        <td class="text-center payment-amount-cell text-success">${amount.toFixed(2)} ج.م</td>
                        <td class="text-center">
                            <span class="badge" style="background: rgba(0,0,0,0.1); color: #333; padding: 6px 12px; border-radius: 6px;">
                                ${methodIcon} ${method}
                            </span>
                        </td>
                        <td class="text-center">${receiptNumber !== '-' ? `<span class="badge bg-light text-dark">${receiptNumber}</span>` : '-'}</td>
                        <td class="text-center">${notes !== '-' ? `<span class="text-muted">${notes}</span>` : '-'}</td>
                        <td class="text-center">
                            <span class="badge bg-secondary">${employeeName}</span>
                        </td>
                        <td class="text-center">
                            <div class="payment-action-buttons">
                                <button class="btn btn-sm btn-warning" onclick="editPayment('${studentId}', '${paymentId}')" title="تعديل">
                                    <i class="material-symbols-rounded" style="font-size: 18px;">edit</i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deletePayment('${studentId}', '${paymentId}')" title="حذف">
                                    <i class="material-symbols-rounded" style="font-size: 18px;">delete</i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            tableHTML += '</tbody></table></div></div>';
            historyDiv.innerHTML = tableHTML;
        }
            
        showBootstrapModal('viewPaymentsModal');
    } catch (error) {
        console.error('Error loading payments:', error);
        showNotification('error', 'حدث خطأ أثناء تحميل سجل المدفوعات');
    }
}

// Helper function to get Arabic payment method
function getPaymentMethodArabic(method) {
    const methods = {
        'cash': 'نقدي',
        'bank_transfer': 'تحويل بنكي',
        'card': 'بطاقة',
        'other': 'أخرى'
    };
    return methods[method] || method;
}

// Helper function to get payment method icon
function getPaymentMethodIcon(method) {
    const icons = {
        'cash': '💵',
        'bank_transfer': '🏦',
        'card': '💳',
        'other': '📝'
    };
    return icons[method] || '💰';
}

// Open add payment modal
function openAddPaymentModal() {
    if (!currentPaymentStudentId) {
        showNotification('error', 'معرف الطالب غير موجود');
        return;
    }
    
    currentPaymentId = null;
    document.getElementById('addEditPaymentModalLabel').innerHTML = '<i class="material-symbols-rounded me-2" style="vertical-align: middle;">payments</i>إضافة دفعة جديدة';
    document.getElementById('paymentStudentId').value = currentPaymentStudentId;
    document.getElementById('paymentId').value = '';
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentAmount').focus();
    document.getElementById('paymentMethod').value = 'cash'; // Default to cash
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDate').value = today;
    document.getElementById('paymentReceiptNumber').value = '';
    document.getElementById('paymentNotes').value = '';
    
    showBootstrapModal('addEditPaymentModal');
}

// Edit payment
function editPayment(studentId, paymentId) {
    currentPaymentStudentId = studentId;
    currentPaymentId = paymentId;
    
    // Find payment in current student data
    const student = allStudents.find(s => s._id === studentId);
    if (!student || !student.payments) {
        showNotification('error', 'الدفعة غير موجودة');
        return;
    }
    
    const payment = student.payments.find(p => {
        const pId = p._id ? (typeof p._id === 'string' ? p._id : p._id.toString()) : (p.id ? (typeof p.id === 'string' ? p.id : p.id.toString()) : '');
        return pId === paymentId;
    });
    if (!payment) {
        // Try to fetch from server
        fetchPaymentAndEdit(studentId, paymentId);
        return;
    }
    
    document.getElementById('addEditPaymentModalLabel').innerHTML = '<i class="material-symbols-rounded me-2" style="vertical-align: middle;">edit</i>تعديل الدفعة';
    document.getElementById('paymentStudentId').value = studentId;
    document.getElementById('paymentId').value = paymentId;
    document.getElementById('paymentAmount').value = payment.amount || '';
    document.getElementById('paymentMethod').value = payment.paymentMethod || 'cash';
    document.getElementById('paymentDate').value = payment.paymentDate 
        ? new Date(payment.paymentDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
    document.getElementById('paymentReceiptNumber').value = payment.receiptNumber || '';
    document.getElementById('paymentNotes').value = payment.notes || '';
    
    showBootstrapModal('addEditPaymentModal');
}

// Fetch payment from server and edit
async function fetchPaymentAndEdit(studentId, paymentId) {
    try {
        const response = await fetch(`/admin/get-student-payments?studentId=${studentId}`);
        const data = await response.json();
        
        if (data.success && data.payments) {
            const payment = data.payments.find(p => {
                const pId = p._id ? (typeof p._id === 'string' ? p._id : p._id.toString()) : (p.id ? (typeof p.id === 'string' ? p.id : p.id.toString()) : '');
                return pId === paymentId;
            });
            if (payment) {
                document.getElementById('addEditPaymentModalLabel').innerHTML = '<i class="material-symbols-rounded me-2" style="vertical-align: middle;">edit</i>تعديل الدفعة';
                document.getElementById('paymentStudentId').value = studentId;
                document.getElementById('paymentId').value = paymentId;
                document.getElementById('paymentAmount').value = payment.amount || '';
                document.getElementById('paymentMethod').value = payment.paymentMethod || 'cash';
                document.getElementById('paymentDate').value = payment.paymentDate 
                    ? new Date(payment.paymentDate).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0];
                document.getElementById('paymentReceiptNumber').value = payment.receiptNumber || '';
                document.getElementById('paymentNotes').value = payment.notes || '';
                
                showBootstrapModal('addEditPaymentModal');
            } else {
                showNotification('error', 'الدفعة غير موجودة');
            }
        }
    } catch (error) {
        console.error('Error fetching payment:', error);
        showNotification('error', 'حدث خطأ أثناء جلب بيانات الدفعة');
    }
}

// Delete payment
async function deletePayment(studentId, paymentId) {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/delete-student-payment/${studentId}/${paymentId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('success', data.message || 'تم حذف الدفعة بنجاح');
            // Reload payments
            await viewPayments(studentId);
            // Reload students list
            loadStudents();
        } else {
            showNotification('error', data.message || 'فشل حذف الدفعة');
        }
    } catch (error) {
        console.error('Error deleting payment:', error);
        showNotification('error', 'حدث خطأ أثناء حذف الدفعة');
    }
}

// Save payment (add or update)
async function savePayment() {
    const studentId = document.getElementById('paymentStudentId').value;
    const paymentId = document.getElementById('paymentId').value;
    const amount = document.getElementById('paymentAmount').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const paymentDate = document.getElementById('paymentDate').value;
    const receiptNumber = document.getElementById('paymentReceiptNumber').value;
    const notes = document.getElementById('paymentNotes').value;
    
    if (!amount || parseFloat(amount) <= 0) {
        showNotification('error', 'المبلغ يجب أن يكون أكبر من صفر');
        return;
    }
    
    try {
        let response;
        let url;
        let method;
        
        if (paymentId) {
            // Update existing payment
            url = `/admin/update-student-payment/${studentId}/${paymentId}`;
            method = 'PUT';
        } else {
            // Add new payment
            url = '/admin/add-student-payment';
            method = 'POST';
        }
        
        response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: studentId,
                amount: parseFloat(amount),
                paymentMethod: paymentMethod,
                paymentDate: paymentDate,
                receiptNumber: receiptNumber || undefined,
                notes: notes || ''
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('success', data.message || 'تم حفظ الدفعة بنجاح');
            hideBootstrapModal('addEditPaymentModal');
            // Reload payments
            await viewPayments(studentId);
            // Reload students list
            loadStudents();
        } else {
            showNotification('error', data.message || 'فشل حفظ الدفعة');
        }
    } catch (error) {
        console.error('Error saving payment:', error);
        showNotification('error', 'حدث خطأ أثناء حفظ الدفعة');
    }
}

// Send student code - show modal
function sendCode(studentId) {
    const student = allStudents.find(s => s._id === studentId);
    
    if (!student) {
        showNotification('error', 'الطالب غير موجود');
        return;
    }
    
    if (!student.parentPhone1) {
        showNotification('error', 'لا يوجد رقم هاتف لولي الأمر');
        return;
    }
    
    currentSendCodeStudentId = studentId;
    document.getElementById('sendCodeStudentName').value = student.studentName || '';
    document.getElementById('sendCodeStudentCode').value = student.studentCode || '';
    document.getElementById('sendCodePhone').value = student.parentPhone1 || '';
    
    showBootstrapModal('sendCodeModal');
}

// Confirm send code
async function confirmSendCode() {
    if (!currentSendCodeStudentId) return;
    
    const studentId = currentSendCodeStudentId;
    currentSendCodeStudentId = null;
    
    try {
        const student = allStudents.find(s => s._id === studentId);
        
        if (!student) {
            showNotification('error', 'الطالب غير موجود');
            return;
        }
        
        // Call the send code endpoint
        const response = await fetch(`/admin/send-code-again/${studentId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('success', data.message || 'تم إرسال الكود بنجاح');
            hideBootstrapModal('sendCodeModal');
        } else {
            showNotification('error', data.message || 'فشل إرسال الكود');
        }
    } catch (error) {
        console.error('Error sending code:', error);
        showNotification('error', 'حدث خطأ أثناء إرسال الكود');
    }
}

// Apply all filters and search
function applyFilters() {
    const searchTerm = document.getElementById('searchStudent').value.toLowerCase().trim();
    const filterClass = document.getElementById('filterClass').value;
    const filterGender = document.getElementById('filterGender').value;
    const filterPayment = document.getElementById('filterPayment').value;
    
    let filtered = allStudents;
    
    // Apply class filter
    if (filterClass) {
        filtered = filtered.filter(student => {
            return student.class && student.class._id === filterClass;
        });
    }
    
    // Apply gender filter
    if (filterGender) {
        filtered = filtered.filter(student => {
            return student.studentGender === filterGender;
        });
    }
    
    // Apply payment status filter
    if (filterPayment) {
        filtered = filtered.filter(student => {
            const totalPaid = student.totalPaid || 0;
            const totalFees = student.totalSchoolFees || 0;
            const remaining = totalFees - totalPaid;
            
            if (filterPayment === 'paid') {
                return remaining <= 0;
            } else if (filterPayment === 'partial') {
                return totalPaid > 0 && remaining > 0;
            } else if (filterPayment === 'unpaid') {
                return totalPaid === 0;
            }
            return true;
        });
    }
    
    // Apply search term filter
    if (searchTerm) {
        filtered = filtered.filter(student => {
            // Search in student name
            const nameMatch = student.studentName && student.studentName.toLowerCase().includes(searchTerm);
            
            // Search in student code
            const codeMatch = student.studentCode && student.studentCode.toLowerCase().includes(searchTerm);
            
            // Search in parent name
            const parentNameMatch = student.parentName && student.parentName.toLowerCase().includes(searchTerm);
            
            // Search in parent phone 1
            const phone1Match = student.parentPhone1 && student.parentPhone1.toString().includes(searchTerm);
            
            // Search in parent phone 2
            const phone2Match = student.parentPhone2 && student.parentPhone2.toString().includes(searchTerm);
            
            // Search in class (academic level and section)
            const classInfo = student.class ? `${student.class.academicLevel} - ${student.class.section}` : '';
            const classMatch = classInfo.toLowerCase().includes(searchTerm);
            
            // Search in total fees
            const totalFeesMatch = student.totalSchoolFees && student.totalSchoolFees.toString().includes(searchTerm);
            
            // Search in paid amount
            const paidMatch = student.totalPaid && student.totalPaid.toString().includes(searchTerm);
            
            // Search in remaining balance
            const remainingMatch = student.remainingBalance && student.remainingBalance.toString().includes(searchTerm);
            
        return (
                nameMatch ||
                codeMatch ||
                parentNameMatch ||
                phone1Match ||
                phone2Match ||
                classMatch ||
                totalFeesMatch ||
                paidMatch ||
                remainingMatch
        );
    });
    }
    
    renderStudents(filtered);
}

// Clear all filters
function clearAllFilters() {
    document.getElementById('searchStudent').value = '';
    document.getElementById('filterClass').value = '';
    document.getElementById('filterGender').value = '';
    document.getElementById('filterPayment').value = '';
    applyFilters();
}

// Show notification
function showNotification(type, message) {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8'
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
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

