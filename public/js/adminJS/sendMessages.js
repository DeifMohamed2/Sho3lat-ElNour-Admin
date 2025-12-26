// Send Messages Page - Client-side JavaScript

let selectedRecipientType = null;
let selectedStudents = [];

// Initialize page
$(document).ready(function() {
    loadClasses();
    loadMessageHistory();
    
    // Initialize Select2
    $('#classSelect').select2({
        theme: 'bootstrap-5',
        dir: 'rtl',
        language: 'ar'
    });
    
    // Student search with debounce
    let searchTimeout;
    $('#studentSearchInput').on('input', function() {
        clearTimeout(searchTimeout);
        const query = $(this).val().trim();
        
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => searchStudents(query), 300);
        } else {
            $('#studentSearchResults').html('');
        }
    });
    
    // Form submission
    $('#messageForm').on('submit', function(e) {
        e.preventDefault();
        sendMessage();
    });
});

// Select recipient type
function selectRecipientType(type) {
    selectedRecipientType = type;
    
    // Update radio button
    $('input[name="recipientType"]').prop('checked', false);
    $(`#recipient${type.charAt(0).toUpperCase() + type.slice(1)}`).prop('checked', true);
    
    // Update active state
    $('.recipient-option').removeClass('active');
    $(`#recipient${type.charAt(0).toUpperCase() + type.slice(1)}`).closest('.recipient-option').addClass('active');
    
    // Show/hide relevant sections
    $('#classSelection').hide();
    $('#studentSearch').hide();
    
    if (type === 'class') {
        $('#classSelection').show();
    } else if (type === 'search') {
        $('#studentSearch').show();
    }
}

// Load classes for dropdown
async function loadClasses() {
    try {
        const response = await fetch('/admin/all-classes');
        const data = await response.json();
        
        if (data.success) {
            const select = $('#classSelect');
            select.empty();
            select.append('<option value="">اختر الفصل...</option>');
            
            data.classes.forEach(cls => {
                select.append(`<option value="${cls._id}">${cls.className}</option>`);
            });
        }
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

// Search students
async function searchStudents(query) {
    try {
        const response = await fetch(`/admin/search-student?search=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        const resultsDiv = $('#studentSearchResults');
        resultsDiv.empty();
        
        if (data.success && data.students && data.students.length > 0) {
            data.students.forEach(student => {
                const checkbox = `
                    <div class="student-checkbox">
                        <input type="checkbox" class="form-check-input" 
                               id="student_${student._id}" 
                               value="${student._id}"
                               onchange="toggleStudent('${student._id}', '${student.studentName}')">
                        <label class="form-check-label me-2" for="student_${student._id}">
                            ${student.studentName} - ${student.studentCode}
                            ${student.class ? `(${student.class.className})` : ''}
                        </label>
                    </div>
                `;
                resultsDiv.append(checkbox);
            });
        } else {
            resultsDiv.html('<p class="text-muted text-center">لا توجد نتائج</p>');
        }
    } catch (error) {
        console.error('Error searching students:', error);
        $('#studentSearchResults').html('<p class="text-danger text-center">حدث خطأ في البحث</p>');
    }
}

// Toggle student selection
function toggleStudent(studentId, studentName) {
    const index = selectedStudents.findIndex(s => s.id === studentId);
    
    if (index > -1) {
        selectedStudents.splice(index, 1);
    } else {
        selectedStudents.push({ id: studentId, name: studentName });
    }
    
    console.log('Selected students:', selectedStudents);
}

// Send message
async function sendMessage() {
    const title = $('#messageTitle').val().trim();
    const body = $('#messageBody').val().trim();
    
    // Validation
    if (!title || !body) {
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'يرجى ملء جميع الحقول المطلوبة',
            confirmButtonText: 'حسناً'
        });
        return;
    }
    
    if (!selectedRecipientType) {
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'يرجى اختيار المستلمين',
            confirmButtonText: 'حسناً'
        });
        return;
    }
    
    // Prepare request data
    let requestData = {
        title: title,
        body: body,
        recipientType: selectedRecipientType
    };
    
    if (selectedRecipientType === 'class') {
        const classId = $('#classSelect').val();
        if (!classId) {
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'يرجى اختيار الفصل',
                confirmButtonText: 'حسناً'
            });
            return;
        }
        requestData.classId = classId;
    } else if (selectedRecipientType === 'search') {
        if (selectedStudents.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'يرجى اختيار طالب واحد على الأقل',
                confirmButtonText: 'حسناً'
            });
            return;
        }
        requestData.studentIds = selectedStudents.map(s => s.id);
    }
    
    // Show loading
    $('.loading-spinner').addClass('active');
    $('.btn-send').prop('disabled', true);
    
    try {
        const response = await fetch('/admin/send-custom-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'تم الإرسال بنجاح',
                text: `تم إرسال الرسالة إلى ${data.studentsNotified || data.totalSuccess} ولي أمر`,
                confirmButtonText: 'حسناً'
            });
            
            clearForm();
            loadMessageHistory();
        } else {
            throw new Error(data.message || 'فشل إرسال الرسالة');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: error.message || 'حدث خطأ أثناء إرسال الرسالة',
            confirmButtonText: 'حسناً'
        });
    } finally {
        $('.loading-spinner').removeClass('active');
        $('.btn-send').prop('disabled', false);
    }
}

// Clear form
function clearForm() {
    $('#messageForm')[0].reset();
    selectedRecipientType = null;
    selectedStudents = [];
    $('.recipient-option').removeClass('active');
    $('#classSelection').hide();
    $('#studentSearch').hide();
    $('#studentSearchResults').empty();
}

// Load message history
async function loadMessageHistory() {
    try {
        const response = await fetch('/admin/message-history');
        const data = await response.json();
        
        const historyDiv = $('#messageHistory');
        historyDiv.empty();
        
        if (data.success && data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => {
                const date = new Date(msg.createdAt);
                const formattedDate = date.toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const historyItem = `
                    <div class="history-item">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h6 class="mb-2 fw-bold" style="color: #000;">${msg.title}</h6>
                                <p class="mb-2" style="color: #333;">${msg.body}</p>
                                <span class="recipients">
                                    <i class="material-symbols-rounded me-1" style="font-size: 18px; vertical-align: middle;">people</i>
                                    ${msg.recipientCount || 0} مستلم
                                </span>
                            </div>
                            <div class="text-end ms-3">
                                <span class="badge-success">تم الإرسال</span>
                                <p class="time mb-0 mt-2">${formattedDate}</p>
                            </div>
                        </div>
                    </div>
                `;
                historyDiv.append(historyItem);
            });
        } else {
            historyDiv.html(`
                <div class="empty-state">
                    <i class="material-symbols-rounded">mail</i>
                    <p>لا توجد رسائل مرسلة بعد</p>
                </div>
            `);
        }
    } catch (error) {
        console.error('Error loading message history:', error);
        $('#messageHistory').html(`
            <div class="empty-state">
                <i class="material-symbols-rounded">error</i>
                <p class="text-danger">حدث خطأ في تحميل السجل</p>
            </div>
        `);
    }
}
