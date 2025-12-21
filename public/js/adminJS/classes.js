// Load all classes on page load
document.addEventListener('DOMContentLoaded', function () {
  loadClasses();
  setupFormHandlers();

  // Fallback: open add modal programmatically
  const addBtn = document.getElementById('openAddClassBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const modalEl = document.getElementById('addClassModal');
      if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      }
    });
  }
});

async function loadClasses() {
  const loading = document.getElementById('loading');
  const tableBody = document.getElementById('classesTableBody');

  try {
    loading.style.display = 'block';

    const response = await fetch('/admin/all-classes');
    const classes = await response.json();

    if (classes.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">
            <p class="text-muted mb-0">لا توجد فصول حالياً. قم بإضافة فصل جديد.</p>
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = classes.map((cls) => renderClassRow(cls)).join('');
    }
  } catch (error) {
    console.error('Error loading classes:', error);
    showNotification('حدث خطأ في تحميل البيانات', 'danger');
  } finally {
    loading.style.display = 'none';
  }
}

function renderClassRow(cls) {
  const fillPercentage =
    cls.capacity > 0 ? (cls.studentCount / cls.capacity) * 100 : 0;
  let capacityClass = 'capacity-low';
  if (fillPercentage > 80) capacityClass = 'capacity-high';
  else if (fillPercentage > 60) capacityClass = 'capacity-medium';

  const statusBadge = cls.isActive
    ? '<span class="badge badge-sm bg-gradient-success">نشط</span>'
    : '<span class="badge badge-sm bg-gradient-secondary">غير نشط</span>';

  return `
    <tr class="class-row">
      <td>
        <div class="d-flex px-2 py-1">
          <div class="d-flex flex-column justify-content-center">
            <h6 class="mb-0 text-sm">${cls.className}</h6>
            ${
              cls.notes
                ? `<p class="text-xs text-secondary mb-0">${cls.notes}</p>`
                : ''
            }
          </div>
        </div>
      </td>
      <td>
        <p class="text-xs font-weight-bold mb-0">${getArabicLevel(
          cls.academicLevel
        )}</p>
      </td>
      <td>
        <p class="text-xs font-weight-bold mb-0">${cls.section}</p>
      </td>
      <td class="align-middle text-center">
        <span class="text-secondary text-xs font-weight-bold">${
          cls.studentCount
        }</span>
      </td>
      <td class="align-middle text-center">
        <span class="capacity-badge ${capacityClass}">
          ${cls.studentCount} / ${cls.capacity}
        </span>
      </td>
      <td class="align-middle text-center text-sm">
        ${statusBadge}
      </td>
      <td class="align-middle text-center">
        <button class="btn btn-link text-secondary mb-0" onclick="editClass('${
          cls._id
        }')" title="تعديل">
          <i class="material-symbols-rounded text-sm">edit</i>
        </button>
        <button class="btn btn-link text-danger mb-0" onclick="confirmDeleteClass('${
          cls._id
        }', '${cls.className}')" title="حذف">
          <i class="material-symbols-rounded text-sm">delete</i>
        </button>
      </td>
    </tr>
  `;
}

function getArabicLevel(level) {
  const levels = {
    'Year 1': 'السنة الأولى',
    'Year 2': 'السنة الثانية',
    'Year 3': 'السنة الثالثة',
    'Year 4': 'السنة الرابعة',
    'Year 5': 'السنة الخامسة',
    'Year 6': 'السنة السادسة',
    'Year 7': 'السنة السابعة',
    'Year 8': 'السنة الثامنة',
    'Year 9': 'السنة التاسعة',
    'Year 10': 'السنة العاشرة',
    'Year 11': 'السنة الحادية عشر',
    'Year 12': 'السنة الثانية عشر',
  };
  return levels[level] || level;
}

function setupFormHandlers() {
  // Add Class Form
  document
    .getElementById('addClassForm')
    .addEventListener('submit', async function (e) {
      e.preventDefault();

      const formData = new FormData(this);
      const data = Object.fromEntries(formData);

      try {
        const response = await fetch('/admin/add-class', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          showNotification('تم إضافة الفصل بنجاح', 'success');
          bootstrap.Modal.getInstance(
            document.getElementById('addClassModal')
          ).hide();
          this.reset();
          loadClasses();
        } else {
          showNotification(result.error || 'حدث خطأ', 'danger');
        }
      } catch (error) {
        console.error('Error adding class:', error);
        showNotification('حدث خطأ في إضافة الفصل', 'danger');
      }
    });

  // Edit Class Form
  document
    .getElementById('editClassForm')
    .addEventListener('submit', async function (e) {
      e.preventDefault();

      const classId = document.getElementById('editClassId').value;
      const data = {
        className: document.getElementById('editClassName').value,
        academicLevel: document.getElementById('editAcademicLevel').value,
        section: document.getElementById('editSection').value,
        capacity: parseInt(document.getElementById('editCapacity').value),
        isActive: document.getElementById('editIsActive').checked,
        notes: document.getElementById('editNotes').value,
      };

      try {
        const response = await fetch(`/admin/update-class/${classId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          showNotification('تم تحديث الفصل بنجاح', 'success');
          bootstrap.Modal.getInstance(
            document.getElementById('editClassModal')
          ).hide();
          loadClasses();
        } else {
          showNotification(result.error || 'حدث خطأ', 'danger');
        }
      } catch (error) {
        console.error('Error updating class:', error);
        showNotification('حدث خطأ في تحديث الفصل', 'danger');
      }
    });
}

async function viewClass(classId) {
  try {
    const response = await fetch(`/admin/get-class/${classId}`);
    const data = await response.json();

    if (response.ok) {
      // Show class details in a modal or redirect to students page
      alert(
        `الفصل: ${data.class.className}\nعدد الطلاب: ${data.students.length}`
      );
      // You can implement a detailed view here
    }
  } catch (error) {
    console.error('Error viewing class:', error);
    showNotification('حدث خطأ في عرض التفاصيل', 'danger');
  }
}

function confirmDeleteClass(classId, className) {
  if (
    confirm(
      `هل أنت متأكد من حذف الفصل "${className}"؟\n\nملاحظة: لن يتم حذف الطلاب المسجلين في هذا الفصل.`
    )
  ) {
    deleteClass(classId);
  }
}

async function deleteClass(classId) {
  try {
    const response = await fetch(`/admin/delete-class/${classId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (response.ok) {
      showNotification('تم حذف الفصل بنجاح', 'success');
      loadClasses();
    } else {
      showNotification(result.error || 'حدث خطأ في حذف الفصل', 'danger');
    }
  } catch (error) {
    console.error('Error deleting class:', error);
    showNotification('حدث خطأ في حذف الفصل', 'danger');
  }
}

async function editClass(classId) {
  try {
    const response = await fetch(`/admin/get-class/${classId}`);
    const data = await response.json();

    if (response.ok) {
      const cls = data.class;
      document.getElementById('editClassId').value = cls._id;
      document.getElementById('editClassName').value = cls.className;
      document.getElementById('editAcademicLevel').value = cls.academicLevel;
      document.getElementById('editSection').value = cls.section;
      document.getElementById('editCapacity').value = cls.capacity;
      document.getElementById('editIsActive').checked = cls.isActive;
      document.getElementById('editNotes').value = cls.notes || '';

      new bootstrap.Modal(document.getElementById('editClassModal')).show();
    }
  } catch (error) {
    console.error('Error loading class:', error);
    showNotification('حدث خطأ في تحميل بيانات الفصل', 'danger');
  }
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  notification.style.cssText =
    'top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; min-width: 300px;';
  notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 5000);
}
