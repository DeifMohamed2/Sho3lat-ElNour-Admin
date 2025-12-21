// Attendance Management - Daily Class-based System
let studentsData = [];
let attendanceRecords = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    
    // Event listeners
    document.getElementById('loadStudentsBtn').addEventListener('click', loadStudents);
    document.getElementById('saveAttendanceBtn').addEventListener('click', saveAttendance);
    document.getElementById('markAllPresent').addEventListener('click', () => markAll('Present'));
    document.getElementById('markAllAbsent').addEventListener('click', () => markAll('Absent'));
    document.getElementById('clearAll').addEventListener('click', clearAll);
});

// Load students for selected class and date
async function loadStudents() {
    const date = document.getElementById('attendanceDate').value;
    const classId = document.getElementById('classId').value;
    
    if (!date || !classId) {
        showNotification('error', 'يرجى اختيار التاريخ والفصل');
        return;
    }
    
    try {
        const response = await fetch(`/admin/get-students-by-class?classId=${classId}&date=${date}`);
        const data = await response.json();
        
        if (data.success) {
            studentsData = data.students || [];
            attendanceRecords = {};
            
            renderStudentsTable();
            document.getElementById('saveAttendanceBtn').disabled = false;
        } else {
            showNotification('error', 'فشل تحميل قائمة الطلاب');
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showNotification('error', 'حدث خطأ أثناء تحميل البيانات');
    }
}

// Render students table
function renderStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';
    
    if (!studentsData || studentsData.length === 0) {
        document.getElementById('studentsTableContainer').style.display = 'none';
        document.getElementById('statsContainer').style.display = 'none';
        document.getElementById('quickActions').style.display = 'none';
        document.getElementById('noDataMessage').style.display = 'block';
        return;
    }
    
    document.getElementById('studentsTableContainer').style.display = 'block';
    document.getElementById('statsContainer').style.display = 'flex';
    document.getElementById('quickActions').style.display = 'block';
    document.getElementById('noDataMessage').style.display = 'none';
    
    studentsData.forEach(student => {
        const row = document.createElement('tr');
        row.className = 'student-row';
        row.dataset.studentId = student._id;
        
        // Pre-fill with existing attendance if available
        const currentStatus = student.attendanceStatus || attendanceRecords[student._id]?.status || null;
        
        row.innerHTML = `
            <td class="text-center">${student.studentCode || 'N/A'}</td>
            <td>${student.studentName || ''}</td>
            <td class="text-center">${student.parentPhone1 || student.studentPhone || ''}</td>
            <td class="text-center">
                <div class="btn-group" role="group">
                    <button type="button" 
                        class="btn status-btn status-present ${currentStatus === 'Present' ? 'active' : ''}" 
                        onclick="setStatus('${student._id}', 'Present')">
                        حاضر
                    </button>
                    <button type="button" 
                        class="btn status-btn status-absent ${currentStatus === 'Absent' ? 'active' : ''}" 
                        onclick="setStatus('${student._id}', 'Absent')">
                        غائب
                    </button>
                    <button type="button" 
                        class="btn status-btn status-late ${currentStatus === 'Late' ? 'active' : ''}" 
                        onclick="setStatus('${student._id}', 'Late')">
                        متأخر
                    </button>
                </div>
            </td>
            <td>
                <input type="text" 
                    class="form-control form-control-sm" 
                    placeholder="ملاحظات..." 
                    id="notes_${student._id}"
                    value="${attendanceRecords[student._id]?.notes || ''}">
            </td>
        `;
        
        tbody.appendChild(row);
        
        // Initialize attendance record if it exists
        if (currentStatus) {
            attendanceRecords[student._id] = {
                status: currentStatus,
                notes: attendanceRecords[student._id]?.notes || '',
            };
        }
    });
    
    updateStatistics();
}

// Set attendance status for a student
window.setStatus = function(studentId, status) {
    // Update record
    if (!attendanceRecords[studentId]) {
        attendanceRecords[studentId] = {};
    }
    attendanceRecords[studentId].status = status;
    attendanceRecords[studentId].notes = document.getElementById(`notes_${studentId}`)?.value || '';
    
    // Update UI - remove active class from all buttons in this row
    const row = document.querySelector(`[data-student-id="${studentId}"]`);
    const buttons = row.querySelectorAll('.status-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to clicked button
    const activeButton = Array.from(buttons).find(btn => btn.textContent.trim() === getStatusLabel(status));
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    updateStatistics();
};

// Get status label in Arabic
function getStatusLabel(status) {
    const labels = {
        Present: 'حاضر',
        Absent: 'غائب',
        Late: 'متأخر',
    };
    return labels[status] || '';
}

// Mark all students with a specific status
function markAll(status) {
    studentsData.forEach(student => {
        setStatus(student._id, status);
    });
}

// Clear all selections
function clearAll() {
    attendanceRecords = {};
    renderStudentsTable();
}

// Update statistics display
function updateStatistics() {
    const total = studentsData.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    
    Object.values(attendanceRecords).forEach(record => {
        if (record.status === 'Present') present++;
        else if (record.status === 'Absent') absent++;
        else if (record.status === 'Late') late++;
    });
    
    document.getElementById('totalStudents').textContent = total;
    document.getElementById('presentCount').textContent = present;
    document.getElementById('absentCount').textContent = absent;
    document.getElementById('lateCount').textContent = late;
}

// Save attendance records
async function saveAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const classId = document.getElementById('classId').value;
    
    if (!date || !classId) {
        showNotification('error', 'يرجى اختيار التاريخ والفصل');
        return;
    }
    
    // Prepare attendance data
    const attendanceData = [];
    
    for (const [studentId, record] of Object.entries(attendanceRecords)) {
        if (record.status) {
            attendanceData.push({
                studentId,
                status: record.status,
                notes: document.getElementById(`notes_${studentId}`)?.value || '',
            });
        }
    }
    
    if (attendanceData.length === 0) {
        showNotification('error', 'لم يتم تحديد حالة أي طالب');
        return;
    }
    
    try {
        const response = await fetch('/admin/record-attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date,
                classId,
                attendance: attendanceData,
            }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', `تم حفظ الحضور بنجاح. ${data.results.created} سجل جديد، ${data.results.updated} سجل محدث`);
            
            if (data.results.errors && data.results.errors.length > 0) {
                console.error('Some records failed:', data.results.errors);
            }
            
            // Reload students to reflect saved data
            loadStudents();
        } else {
            showNotification('error', data.error || 'فشل حفظ الحضور');
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        showNotification('error', 'حدث خطأ أثناء حفظ البيانات');
    }
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
