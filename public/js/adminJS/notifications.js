// Professional Notification Management System
class NotificationManager {
  constructor() {
    this.students = [];
    this.filteredStudents = [];
    this.teachers = [];
    this.templates = [];
    this.currentPage = 1;
    this.pageSize = 10;
    this.totalPages = 0;
    this.totalCount = 0;
    this.searchTerm = '';
    this.selectedTeacher = '';
    this.selectedPaymentType = '';
    this.isLoading = false;
    this.currentStudent = null;
    
    this.initializeEventListeners();
    this.loadData();
  }

  initializeEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(() => {
        this.searchTerm = searchInput.value.trim();
        this.currentPage = 1;
        this.filterAndRenderStudents();
      }, 300));
    }

    // Filter functionality
    const teacherFilter = document.getElementById('teacherFilter');
    if (teacherFilter) {
      teacherFilter.addEventListener('change', () => {
        this.selectedTeacher = teacherFilter.value;
        this.currentPage = 1;
        this.filterAndRenderStudents();
      });
    }

    const paymentTypeFilter = document.getElementById('paymentTypeFilter');
    if (paymentTypeFilter) {
      paymentTypeFilter.addEventListener('change', () => {
        this.selectedPaymentType = paymentTypeFilter.value;
        this.currentPage = 1;
        this.filterAndRenderStudents();
      });
    }

    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', () => {
        this.pageSize = parseInt(pageSizeSelect.value);
        this.currentPage = 1;
        this.calculatePagination();
        this.renderStudents();
        this.renderPagination();
      });
    }

    // Template functionality
    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    if (saveTemplateBtn) {
      saveTemplateBtn.addEventListener('click', () => this.saveTemplate());
    }

    const updateTemplateBtn = document.getElementById('updateTemplateBtn');
    if (updateTemplateBtn) {
      updateTemplateBtn.addEventListener('click', () => this.updateTemplate());
    }

    // Template type change
    const templateType = document.getElementById('templateType');
    if (templateType) {
      templateType.addEventListener('change', () => this.loadTemplateMessage());
    }

    const editTemplateType = document.getElementById('editTemplateType');
    if (editTemplateType) {
      editTemplateType.addEventListener('change', () => this.loadEditTemplateMessage());
    }

    // Bulk notification functionality
    const bulkTeacherFilter = document.getElementById('bulkTeacherFilter');
    if (bulkTeacherFilter) {
      bulkTeacherFilter.addEventListener('change', () => this.updateBulkFilters());
    }

    const bulkCourseFilter = document.getElementById('bulkCourseFilter');
    if (bulkCourseFilter) {
      bulkCourseFilter.addEventListener('change', () => this.updateBulkStudentSummary());
    }

    const bulkPaymentTypeFilter = document.getElementById('bulkPaymentTypeFilter');
    if (bulkPaymentTypeFilter) {
      bulkPaymentTypeFilter.addEventListener('change', () => this.updateBulkStudentSummary());
    }

    const bulkNotificationType = document.getElementById('bulkNotificationType');
    if (bulkNotificationType) {
      bulkNotificationType.addEventListener('change', () => this.updateBulkMessage());
    }

    const bulkNotificationTemplate = document.getElementById('bulkNotificationTemplate');
    if (bulkNotificationTemplate) {
      bulkNotificationTemplate.addEventListener('change', () => this.applyBulkTemplate());
    }

    const previewBulkBtn = document.getElementById('previewBulkBtn');
    if (previewBulkBtn) {
      previewBulkBtn.addEventListener('click', () => this.previewBulkStudents());
    }

    const confirmBulkSendBtn = document.getElementById('confirmBulkSendBtn');
    if (confirmBulkSendBtn) {
      confirmBulkSendBtn.addEventListener('click', () => this.sendBulkNotifications());
    }

    const singleNotificationTemplate = document.getElementById('singleNotificationTemplate');
    if (singleNotificationTemplate) {
      singleNotificationTemplate.addEventListener('change', () => this.applySingleTemplate());
    }

    // Send notifications
    const sendNotificationBtn = document.getElementById('sendNotificationBtn');
    if (sendNotificationBtn) {
      sendNotificationBtn.addEventListener('click', () => this.sendNotification());
    }

    const sendBulkNotificationsBtn = document.getElementById('sendBulkNotificationsBtn');
    if (sendBulkNotificationsBtn) {
      sendBulkNotificationsBtn.addEventListener('click', () => this.sendBulkNotifications());
    }
  }

  // Debounce function for search performance
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async loadData() {
    this.showLoading(true);
    
    try {
      console.log('Loading notification data...');
      
      // Load data in parallel for better performance
      const [studentsResponse, teachersResponse, templatesResponse] = await Promise.all([
        this.fetchStudentsWithBalances(),
        this.fetchTeachers(),
        this.fetchTemplates()
      ]);

      this.students = studentsResponse;
      this.teachers = teachersResponse;
      this.templates = templatesResponse;
      
      this.populateTeacherFilter();
      this.populateTemplateFilters();
      this.filterAndRenderStudents();
      this.renderTemplates();
      this.updateDashboardStats();
      
      console.log('All data loaded successfully');
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('حدث خطأ أثناء تحميل البيانات', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async fetchStudentsWithBalances() {
    try {
      const response = await fetch('/employee/api/students-with-balances');
      const data = await response.json();
      
      if (response.ok) {
        return data.students || [];
      } else {
        throw new Error(data.message || 'Failed to load students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      this.showToast('فشل في تحميل بيانات الطلاب', 'error');
      return [];
    }
  }

  async fetchTeachers() {
    try {
      const response = await fetch('/employee/all-teachers');
      const data = await response.json();
      
      if (response.ok) {
        return data || [];
      } else {
        throw new Error('Failed to load teachers');
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      return [];
    }
  }

  async fetchTemplates() {
    try {
      const response = await fetch('/employee/api/notification-templates');
      const data = await response.json();
      
      if (response.ok) {
        return data.templates || [];
      } else {
        throw new Error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

    populateTeacherFilter() {
    const teacherFilter = document.getElementById('teacherFilter');
    const bulkTeacherFilter = document.getElementById('bulkTeacherFilter');
    
    if (!this.teachers) return;

    // Populate main teacher filter
    if (teacherFilter) {
      while (teacherFilter.children.length > 1) {
        teacherFilter.removeChild(teacherFilter.lastChild);
      }
      
      this.teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher._id;
        option.textContent = teacher.teacherName;
        teacherFilter.appendChild(option);
      });
    }

    // Populate bulk teacher filter
    if (bulkTeacherFilter) {
      while (bulkTeacherFilter.children.length > 1) {
        bulkTeacherFilter.removeChild(bulkTeacherFilter.lastChild);
      }
      
      this.teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher._id;
        option.textContent = teacher.teacherName;
        bulkTeacherFilter.appendChild(option);
      });
    }
  }

  populateTemplateFilters() {
    const bulkTemplate = document.getElementById('bulkNotificationTemplate');
    const singleTemplate = document.getElementById('singleNotificationTemplate');
    
    if (bulkTemplate) {
      bulkTemplate.innerHTML = '<option value="">اختر قالب (اختياري)</option>';
      this.templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template._id;
        option.textContent = template.name;
        bulkTemplate.appendChild(option);
      });
    }
    
    if (singleTemplate) {
      singleTemplate.innerHTML = '<option value="">اختر قالب</option>';
      this.templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template._id;
        option.textContent = template.name;
        singleTemplate.appendChild(option);
      });
    }
  }

  filterAndRenderStudents() {
    // Apply filters
    this.filteredStudents = this.students.filter(student => {
      const matchesSearch = !this.searchTerm || 
        student.studentName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        student.studentCode?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        student.studentPhone?.includes(this.searchTerm) ||
        student.parentPhone?.includes(this.searchTerm);

      const matchesTeacher = !this.selectedTeacher || 
        student.teacherId === this.selectedTeacher;

      const matchesPaymentType = !this.selectedPaymentType || 
        student.paymentType === this.selectedPaymentType;

      return matchesSearch && matchesTeacher && matchesPaymentType;
    });

    this.calculatePagination();
    this.renderStudents();
    this.renderPagination();
    this.updatePaginationInfo();
  }

  calculatePagination() {
    this.totalCount = this.filteredStudents.length;
    this.totalPages = Math.ceil(this.totalCount / this.pageSize);
    
    // Ensure current page is within bounds
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
  }

  renderStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const paginatedStudents = this.filteredStudents.slice(startIndex, endIndex);

    tbody.innerHTML = '';
    
    if (paginatedStudents.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="10" class="text-center py-4">
          <div class="empty-state">
            <i class="material-symbols-rounded">inbox</i>
            <p class="mb-0">لا يوجد طلاب بمبالغ متبقية</p>
          </div>
        </td>
      `;
      tbody.appendChild(row);
      return;
    }
    
    paginatedStudents.forEach((student, index) => {
      const row = document.createElement('tr');
      const rowNumber = startIndex + index + 1;
      
      row.innerHTML = `
        <td>${rowNumber}</td>
        <td><span class="student-code">${student.studentCode || 'غير محدد'}</span></td>
        <td>
          <div class="d-flex flex-column">
            <strong>${student.studentName || 'غير محدد'}</strong>
            <small class="text-muted">${student.schoolName || ''}</small>
            </div>
        </td>
        <td>
          <div class="d-flex flex-column">
            <span>${student.studentPhone || 'غير محدد'}</span>
            <small class="text-muted">ولي الأمر: ${student.parentPhone || 'غير محدد'}</small>
          </div>
        </td>
        <td>${student.teacherName || 'غير محدد'}</td>
        <td>${student.courseName || 'غير محدد'}</td>
        <td>
          <span class="amount-remaining">${student.amountRemaining || 0} ج.م</span>
        </td>
        <td>
          <span class="badge ${student.paymentType === 'perCourse' ? 'bg-success' : 'bg-info'}">
            ${student.paymentType === 'perCourse' ? 'Per Course' : 'Per Session'}
          </span>
        </td>
        <td>
          <small class="text-muted">
            ${student.lastUpdate ? new Date(student.lastUpdate).toLocaleDateString('ar-EG') : 'غير محدد'}
          </small>
        </td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-primary" onclick="notificationManager.sendNotificationToStudent('${student.studentId}')" title="إرسال إشعار">
              <i class="material-symbols-rounded text-sm">send</i>
          </button>
            <button class="btn btn-sm btn-info" onclick="notificationManager.viewStudentDetails('${student.studentId}')" title="عرض التفاصيل">
              <i class="material-symbols-rounded text-sm">visibility</i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  renderTemplates() {
    const tbody = document.getElementById('templatesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (this.templates.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="5" class="text-center py-4">
          <div class="empty-state">
            <i class="material-symbols-rounded">description</i>
            <p class="mb-0">لا يوجد قوالب إشعارات</p>
          </div>
        </td>
      `;
      tbody.appendChild(row);
      return;
    }
    
    this.templates.forEach(template => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="d-flex flex-column">
            <strong>${template.name}</strong>
          </div>
        </td>
        <td>
          <span class="badge ${this.getTemplateTypeColor(template.type)}">${this.getTemplateTypeName(template.type)}</span>
        </td>
        <td>
          <p class="text-sm text-muted mb-0" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${template.message}
          </p>
        </td>
        <td>
          <small class="text-muted">
            ${template.updatedAt ? new Date(template.updatedAt).toLocaleDateString('ar-EG') : 'غير محدد'}
          </small>
        </td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-success" onclick="notificationManager.useTemplate('${template._id}')" title="استخدام">
              <i class="material-symbols-rounded text-sm">content_copy</i>
          </button>
            <button class="btn btn-sm btn-warning" onclick="notificationManager.editTemplate('${template._id}')" title="تعديل">
              <i class="material-symbols-rounded text-sm">edit</i>
          </button>
            <button class="btn btn-sm btn-danger" onclick="notificationManager.deleteTemplate('${template._id}')" title="حذف">
              <i class="material-symbols-rounded text-sm">delete</i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  getTemplateTypeColor(type) {
    const colors = {
      'balance': 'bg-warning',
      'installment': 'bg-success',
      'completion': 'bg-info',
      'welcome': 'bg-primary',
      'custom': 'bg-secondary'
    };
    return colors[type] || 'bg-secondary';
  }

  getTemplateTypeName(type) {
    const names = {
      'balance': 'تذكير بالمبلغ المتبقي',
      'installment': 'تذكير بالقسط التالي',
      'completion': 'إشعار إكمال الكورس',
      'welcome': 'رسالة ترحيب',
      'custom': 'مخصص'
    };
    return names[type] || 'مخصص';
  }

  renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    pagination.innerHTML = '';

    if (this.totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.innerHTML = '<i class="material-symbols-rounded text-sm">chevron_left</i>';
    prevLi.appendChild(prevLink);
    
    if (this.currentPage > 1) {
      prevLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToPage(this.currentPage - 1);
      });
    }
    pagination.appendChild(prevLi);

    // Page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      const li = document.createElement('li');
      li.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
      const link = document.createElement('a');
      link.className = 'page-link';
      link.href = '#';
      link.textContent = i;
      li.appendChild(link);
      
      if (i !== this.currentPage) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.goToPage(i);
        });
      }
      pagination.appendChild(li);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}`;
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.innerHTML = '<i class="material-symbols-rounded text-sm">chevron_right</i>';
    nextLi.appendChild(nextLink);
    
    if (this.currentPage < this.totalPages) {
      nextLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToPage(this.currentPage + 1);
      });
    }
    pagination.appendChild(nextLi);
  }

  goToPage(page) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.renderStudents();
      this.renderPagination();
      this.updatePaginationInfo();
      
      // Scroll to top of table
      const table = document.getElementById('studentsTable');
      if (table) {
        table.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  updatePaginationInfo() {
    const startIndex = this.totalCount > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0;
    const endIndex = Math.min(this.currentPage * this.pageSize, this.totalCount);
    
    const startElement = document.getElementById('startIndex');
    const endElement = document.getElementById('endIndex');
    const totalElement = document.getElementById('totalCount');
    
    if (startElement) startElement.textContent = startIndex;
    if (endElement) endElement.textContent = endIndex;
    if (totalElement) totalElement.textContent = this.totalCount;
  }

  updateDashboardStats() {
    const studentsWithBalances = this.students.filter(s => s.amountRemaining > 0);
    const studentsWithInstallments = this.students.filter(s => s.paymentType === 'perCourse' && s.amountRemaining > 0);
    const totalAmountRemaining = this.students.reduce((sum, s) => sum + (s.amountRemaining || 0), 0);
    
    document.getElementById('studentsWithBalancesCount').textContent = studentsWithBalances.length;
    document.getElementById('studentsWithInstallmentsCount').textContent = studentsWithInstallments.length;
    document.getElementById('totalAmountRemaining').textContent = `${totalAmountRemaining.toLocaleString()} ج.م`;
    document.getElementById('todayNotificationsCount').textContent = Math.floor(Math.random() * 50) + 10; // Mock data
  }

  sendNotificationToStudent(studentId) {
    const student = this.students.find(s => s.studentId === studentId);
    if (!student) {
      this.showToast('لم يتم العثور على بيانات الطالب', 'error');
      return;
    }

    this.showSendNotificationModal(student);
  }

  showSendNotificationModal(student) {
    // Populate modal with student data
    document.getElementById('modalStudentName').textContent = student.studentName;
    document.getElementById('modalStudentCode').textContent = student.studentCode;
    document.getElementById('modalStudentPhone').textContent = student.studentPhone;
    document.getElementById('modalTeacherName').textContent = student.teacherName;
    document.getElementById('modalCourseName').textContent = student.courseName;
    document.getElementById('modalAmountRemaining').textContent = `${student.amountRemaining} ج.م`;

    // Populate phone numbers
    const phoneSelect = document.getElementById('notificationPhoneSelect');
    phoneSelect.innerHTML = '<option value="">اختر رقم الهاتف</option>';
    
    if (student.studentPhone) {
      const studentOption = document.createElement('option');
      studentOption.value = student.studentPhone;
      studentOption.textContent = `الطالب: ${student.studentPhone}`;
      phoneSelect.appendChild(studentOption);
    }
    
    if (student.parentPhone) {
      const parentOption = document.createElement('option');
      parentOption.value = student.parentPhone;
      parentOption.textContent = `ولي الأمر: ${student.parentPhone}`;
      phoneSelect.appendChild(parentOption);
    }

    // Set default message
    const defaultMessage = `مرحباً ${student.studentName}، يتبقى مبلغ ${student.amountRemaining} ج.م في كورس ${student.courseName} مع الأستاذ ${student.teacherName}. يرجى التواصل معنا لتسديد المبلغ المتبقي.`;
    document.getElementById('notificationMessage').value = defaultMessage;

    // Store current student for sending
    this.currentStudent = student;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('sendNotificationModal'));
    modal.show();
  }

  async sendNotification() {
    const phoneNumber = document.getElementById('notificationPhoneSelect').value;
    const message = document.getElementById('notificationMessage').value;

    if (!phoneNumber) {
      this.showToast('يرجى اختيار رقم الهاتف', 'error');
      return;
    }

    if (!message.trim()) {
      this.showToast('يرجى كتابة الرسالة', 'error');
      return;
    }

    this.showLoading(true);

    try {
      const response = await fetch('/employee/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: this.currentStudent.studentId,
          message: message,
          phoneNumber: phoneNumber,
          notificationType: 'single'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.showToast('تم إرسال الإشعار بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('sendNotificationModal')).hide();
      } else {
        throw new Error(data.message || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      this.showToast('فشل في إرسال الإشعار', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // Template Management
  async saveTemplate() {
    const name = document.getElementById('templateName').value;
    const type = document.getElementById('templateType').value;
    const message = document.getElementById('templateMessage').value;

    if (!name.trim() || !message.trim()) {
      this.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    this.showLoading(true);

    try {
      const response = await fetch('/employee/save-notification-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          type: type,
          message: message
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.showToast('تم حفظ القالب بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addTemplateModal')).hide();
        document.getElementById('addTemplateForm').reset();
        await this.loadData(); // Reload templates
      } else {
        throw new Error(data.message || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      this.showToast('فشل في حفظ القالب', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async updateTemplate() {
    const id = document.getElementById('editTemplateId').value;
    const name = document.getElementById('editTemplateName').value;
    const type = document.getElementById('editTemplateType').value;
    const message = document.getElementById('editTemplateMessage').value;

    if (!name.trim() || !message.trim()) {
      this.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    this.showLoading(true);

    try {
      const response = await fetch(`/employee/update-notification-template/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          type: type,
          message: message
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.showToast('تم تحديث القالب بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editTemplateModal')).hide();
        await this.loadData(); // Reload templates
      } else {
        throw new Error(data.message || 'Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      this.showToast('فشل في تحديث القالب', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async deleteTemplate(templateId) {
    const confirmed = await this.showConfirmation(
      'هل أنت متأكد من حذف هذا القالب؟',
      'حذف القالب'
    );

    if (!confirmed) return;

    this.showLoading(true);

    try {
      const response = await fetch(`/employee/delete-notification-template/${templateId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.showToast('تم حذف القالب بنجاح', 'success');
        await this.loadData(); // Reload templates
      } else {
        throw new Error(data.message || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      this.showToast('فشل في حذف القالب', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  editTemplate(templateId) {
    const template = this.templates.find(t => t._id === templateId);
    if (!template) return;

    document.getElementById('editTemplateId').value = template._id;
    document.getElementById('editTemplateName').value = template.name;
    document.getElementById('editTemplateType').value = template.type;
    document.getElementById('editTemplateMessage').value = template.message;

    const modal = new bootstrap.Modal(document.getElementById('editTemplateModal'));
    modal.show();
  }

  useTemplate(templateId) {
    const template = this.templates.find(t => t._id === templateId);
    if (!template) return;

    document.getElementById('bulkNotificationMessage').value = template.message;
    document.getElementById('bulkNotificationType').value = template.type;
    
    this.showToast('تم تطبيق القالب', 'success');
  }

  applyBulkTemplate() {
    const templateId = document.getElementById('bulkNotificationTemplate').value;
    if (!templateId) return;

    const template = this.templates.find(t => t._id === templateId);
    if (template) {
      document.getElementById('bulkNotificationMessage').value = template.message;
      document.getElementById('bulkNotificationType').value = template.type;
    }
  }

  applySingleTemplate() {
    const templateId = document.getElementById('singleNotificationTemplate').value;
    if (!templateId) return;

    const template = this.templates.find(t => t._id === templateId);
    if (template && this.currentStudent) {
      const personalizedMessage = this.personalizeMessage(template.message, this.currentStudent);
      document.getElementById('notificationMessage').value = personalizedMessage;
    }
  }

  personalizeMessage(message, student) {
    return message
      .replace(/{studentName}/g, student.studentName || '')
      .replace(/{teacherName}/g, student.teacherName || '')
      .replace(/{courseName}/g, student.courseName || '')
      .replace(/{amountRemaining}/g, student.amountRemaining || 0)
      .replace(/{totalCourseCost}/g, student.totalCourseCost || 0);
  }

  loadTemplateMessage() {
    const type = document.getElementById('templateType').value;
    let defaultMessage = '';
    
    switch (type) {
      case 'balance':
      defaultMessage = 'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م في كورس {courseName} مع الأستاذ {teacherName}. يرجى التواصل معنا لتسديد المبلغ المتبقي.';
        break;
      case 'installment':
      defaultMessage = 'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م من إجمالي {totalCourseCost} ج.م في كورس {courseName}. يرجى التواصل معنا لدفع القسط التالي.';
        break;
      case 'completion':
        defaultMessage = 'مرحباً {studentName}، تم إكمال كورس {courseName} مع الأستاذ {teacherName} بنجاح. شكراً لثقتكم بنا!';
        break;
      case 'welcome':
        defaultMessage = 'مرحباً {studentName}، أهلاً وسهلاً بك في مركز GTA. نتمنى لك تجربة تعليمية ممتعة في كورس {courseName} مع الأستاذ {teacherName}.';
        break;
    }
    
    if (defaultMessage) {
      document.getElementById('templateMessage').value = defaultMessage;
    }
  }

  loadEditTemplateMessage() {
    const type = document.getElementById('editTemplateType').value;
    let defaultMessage = '';
    
    switch (type) {
      case 'balance':
        defaultMessage = 'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م في كورس {courseName} مع الأستاذ {teacherName}. يرجى التواصل معنا لتسديد المبلغ المتبقي.';
        break;
      case 'installment':
        defaultMessage = 'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م من إجمالي {totalCourseCost} ج.م في كورس {courseName}. يرجى التواصل معنا لدفع القسط التالي.';
        break;
      case 'completion':
        defaultMessage = 'مرحباً {studentName}، تم إكمال كورس {courseName} مع الأستاذ {teacherName} بنجاح. شكراً لثقتكم بنا!';
        break;
      case 'welcome':
        defaultMessage = 'مرحباً {studentName}، أهلاً وسهلاً بك في مركز GTA. نتمنى لك تجربة تعليمية ممتعة في كورس {courseName} مع الأستاذ {teacherName}.';
        break;
    }
    
    if (defaultMessage) {
      document.getElementById('editTemplateMessage').value = defaultMessage;
    }
  }

  updateBulkFilters() {
    const teacherId = document.getElementById('bulkTeacherFilter').value;
    const courseFilter = document.getElementById('bulkCourseFilter');
    
    // Clear course filter
    courseFilter.innerHTML = '<option value="">اختر الكورس</option>';
    courseFilter.disabled = !teacherId;
    
    if (teacherId) {
      // Get courses for selected teacher
      const teacher = this.teachers.find(t => t._id === teacherId);
      if (teacher) {
        // Extract courses from students data for this teacher
        const teacherStudents = this.students.filter(s => s.teacherId === teacherId);
        const courses = [...new Set(teacherStudents.map(s => s.courseName))];
        console.log(teacherStudents);
        courses.forEach(course => {
          const option = document.createElement('option');
          option.value = course;
          option.textContent = course;
          courseFilter.appendChild(option);
        });
      }
    }
    
    this.updateBulkStudentSummary();
  }

  updateBulkStudentSummary() {
    const teacherId = document.getElementById('bulkTeacherFilter').value;
    const courseName = document.getElementById('bulkCourseFilter').value;
    const paymentType = document.getElementById('bulkPaymentTypeFilter').value;
    
    let filteredStudents = this.students.filter(student => {
      const matchesTeacher = !teacherId || student.teacherId === teacherId;
      const matchesCourse = !courseName || student.courseName === courseName;
      const matchesPaymentType = !paymentType || student.paymentType === paymentType;
      const hasBalance = student.amountRemaining > 0;
      
      return matchesTeacher && matchesCourse && matchesPaymentType && hasBalance;
    });
    
    const studentCount = filteredStudents.length;
    const totalAmount = filteredStudents.reduce((sum, s) => sum + (s.amountRemaining || 0), 0);
    
    const summaryElement = document.getElementById('bulkStudentSummary');
    const countElement = document.getElementById('bulkStudentCount');
    const amountElement = document.getElementById('bulkTotalAmount');
    
    if (studentCount > 0) {
      countElement.textContent = studentCount;
      amountElement.textContent = totalAmount.toLocaleString();
      summaryElement.style.display = 'block';
    } else {
      summaryElement.style.display = 'none';
    }
  }

  updateBulkMessage() {
    const type = document.getElementById('bulkNotificationType').value;
    
    let defaultMessage = '';
    
    if (type === 'balance') {
      defaultMessage = 'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م في كورس {courseName} مع الأستاذ {teacherName}. يرجى التواصل معنا لتسديد المبلغ المتبقي.';
    } else if (type === 'installment') {
      defaultMessage = 'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م من إجمالي {totalCourseCost} ج.م في كورس {courseName}. يرجى التواصل معنا لدفع القسط التالي.';
    }
    
    if (defaultMessage) {
      document.getElementById('bulkNotificationMessage').value = defaultMessage;
    }
  }

  previewBulkStudents() {
    const teacherId = document.getElementById('bulkTeacherFilter').value;
    const courseName = document.getElementById('bulkCourseFilter').value;
    const paymentType = document.getElementById('bulkPaymentTypeFilter').value;
    
    let filteredStudents = this.students.filter(student => {
      const matchesTeacher = !teacherId || student.teacherId === teacherId;
      const matchesCourse = !courseName || student.courseName === courseName;
      const matchesPaymentType = !paymentType || student.paymentType === paymentType;
      const hasBalance = student.amountRemaining > 0;
      
      return matchesTeacher && matchesCourse && matchesPaymentType && hasBalance;
    });
    
    if (filteredStudents.length === 0) {
      this.showToast('لا يوجد طلاب مطابقين للمعايير المحددة', 'warning');
      return;
    }
    
    this.renderBulkPreviewTable(filteredStudents);
    
    const modal = new bootstrap.Modal(document.getElementById('bulkPreviewModal'));
    modal.show();
  }

  renderBulkPreviewTable(students) {
    const tbody = document.getElementById('bulkPreviewTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    students.forEach((student, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td><span class="student-code">${student.studentCode || 'غير محدد'}</span></td>
        <td>${student.studentName || 'غير محدد'}</td>
        <td>${student.studentPhone || 'غير محدد'}</td>
        <td>${student.teacherName || 'غير محدد'}</td>
        <td>${student.courseName || 'غير محدد'}</td>
        <td><span class="amount-remaining">${student.amountRemaining || 0} ج.م</span></td>
        <td>
          <span class="badge ${student.paymentType === 'perCourse' ? 'bg-success' : 'bg-info'}">
            ${student.paymentType === 'perCourse' ? 'Per Course' : 'Per Session'}
          </span>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  async sendBulkNotifications() {
    const teacherId = document.getElementById('bulkTeacherFilter').value;
    const courseName = document.getElementById('bulkCourseFilter').value;
    const paymentType = document.getElementById('bulkPaymentTypeFilter').value;
    const notificationType = document.getElementById('bulkNotificationType').value;
    const message = document.getElementById('bulkNotificationMessage').value;
    const batchSize = parseInt(document.getElementById('bulkBatchSize').value);

    if (!message.trim()) {
      this.showToast('يرجى كتابة الرسالة', 'error');
      return;
    }

    // Filter students based on selected criteria
    let students = this.students.filter(student => {
      const matchesTeacher = !teacherId || student.teacherId === teacherId;
      const matchesCourse = !courseName || student.courseName === courseName;
      const matchesPaymentType = !paymentType || student.paymentType === paymentType;
      const hasBalance = student.amountRemaining > 0;
      
      return matchesTeacher && matchesCourse && matchesPaymentType && hasBalance;
    });

    if (students.length === 0) {
      this.showToast('لا يوجد طلاب مطابقين للمعايير المحددة', 'warning');
      return;
    }

    const confirmed = await this.showConfirmation(
      `هل أنت متأكد من إرسال ${students.length} إشعار؟`,
      'إرسال الإشعارات المجمعة'
    );

    if (!confirmed) return;

    this.showLoading(true);
    document.getElementById('bulkNotificationStatus').textContent = 'جاري الإرسال...';

    try {
      // Send in batches to avoid overwhelming the API
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        
        const response = await fetch('/employee/send-bulk-notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            students: batch,
            message: message,
            notificationType: notificationType
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          successCount += data.summary?.success || batch.length;
          failureCount += data.summary?.failure || 0;
          results.push(...(data.results || []));
          
          // Update status
          document.getElementById('bulkNotificationStatus').textContent = 
            `تم إرسال ${i + batch.length} من ${students.length} إشعار...`;
        } else {
          failureCount += batch.length;
          results.push(...batch.map(s => ({
            studentId: s.studentId,
            studentName: s.studentName,
            phone: s.parentPhone || s.studentPhone,
            status: 'failed',
            message: data.message || 'فشل في الإرسال'
          })));
        }

        // Add delay between batches
        if (i + batchSize < students.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const finalMessage = `تم إرسال ${successCount} إشعار بنجاح، وفشل ${failureCount} إشعار`;
      this.showToast(finalMessage, successCount > 0 ? 'success' : 'error');
      document.getElementById('bulkNotificationStatus').textContent = finalMessage;
      
      // Update dashboard stats
      this.updateDashboardStats();
      
      // Close modal if open
      const modal = bootstrap.Modal.getInstance(document.getElementById('bulkPreviewModal'));
      if (modal) {
        modal.hide();
      }

    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      this.showToast('فشل في إرسال الإشعارات المجمعة', 'error');
      document.getElementById('bulkNotificationStatus').textContent = 'فشل في الإرسال';
    } finally {
      this.showLoading(false);
    }
  }

  viewStudentDetails(studentId) {
    // Implement student details view
    this.showToast('سيتم إضافة عرض تفاصيل الطالب قريباً', 'info');
  }

  async exportToExcel() {
    if (this.filteredStudents.length === 0) {
      this.showToast('لا يوجد بيانات للتصدير', 'warning');
      return;
    }

    this.showToast('سيتم إضافة تصدير البيانات قريباً', 'info');
  }

  refreshData() {
    this.loadData();
  }

  showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
      spinner.style.display = show ? 'flex' : 'none';
    }
    this.isLoading = show;
  }

  showToast(message, type = 'info') {
    if (typeof Swal !== 'undefined') {
      const iconMap = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info'
      };

      Swal.fire({
        icon: iconMap[type] || 'info',
        title: this.getToastTitle(type),
        text: message,
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-start',
        customClass: {
          popup: 'swal2-toast-custom'
        }
      });
    } else {
      alert(`${this.getToastTitle(type)}: ${message}`);
    }
  }

  getToastTitle(type) {
    const titles = {
      success: 'نجح',
      error: 'خطأ',
      warning: 'تحذير',
      info: 'معلومات'
    };
    return titles[type] || 'معلومات';
  }

  async showConfirmation(message, title = 'تأكيد') {
    if (typeof Swal !== 'undefined') {
    const result = await Swal.fire({
      title: title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'نعم',
      cancelButtonText: 'إلغاء'
    });
    
    return result.isConfirmed;
    } else {
      return confirm(`${title}: ${message}`);
    }
  }
}

// Initialize the notification manager when the page loads
let notificationManager;

document.addEventListener('DOMContentLoaded', function() {
  notificationManager = new NotificationManager();
});

// Make it globally accessible
window.notificationManager = notificationManager;
