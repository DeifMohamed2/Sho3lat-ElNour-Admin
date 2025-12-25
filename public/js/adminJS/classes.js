// Load all classes on page load
document.addEventListener('DOMContentLoaded', function () {
  loadClasses();
  setupFormHandlers();
  setupImageHandlers();

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
          <td colspan="8" class="text-center py-4">
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

  const scheduleImageCell = cls.scheduleImage
    ? `<button class="btn btn-link text-primary mb-0 p-0" onclick="viewScheduleImage('${cls.scheduleImage}')" title="عرض الجدول">
         <i class="material-symbols-rounded text-lg">image</i>
       </button>`
    : '<span class="text-xs text-secondary">-</span>';

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
      <td class="align-middle text-center">
        ${scheduleImageCell}
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

function viewScheduleImage(imagePath) {
  const modal = new bootstrap.Modal(document.getElementById('scheduleImageModal'));
  document.getElementById('scheduleImageViewer').src = imagePath;
  modal.show();
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

function setupImageHandlers() {
  // Add Class Image Preview
  const addImageInput = document.getElementById('addScheduleImage');
  const addPreview = document.getElementById('addImagePreview');
  const addPreviewImg = document.getElementById('addPreviewImg');
  const removeAddPreview = document.getElementById('removeAddPreview');

  if (addImageInput) {
    addImageInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          addPreviewImg.src = e.target.result;
          addPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (removeAddPreview) {
    removeAddPreview.addEventListener('click', function () {
      addImageInput.value = '';
      addPreview.style.display = 'none';
      addPreviewImg.src = '';
    });
  }

  // Edit Class Image Preview
  const editImageInput = document.getElementById('editScheduleImage');
  const editPreview = document.getElementById('editImagePreview');
  const editPreviewImg = document.getElementById('editPreviewImg');
  const removeEditPreview = document.getElementById('removeEditPreview');

  if (editImageInput) {
    editImageInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          editPreviewImg.src = e.target.result;
          editPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (removeEditPreview) {
    removeEditPreview.addEventListener('click', function () {
      editImageInput.value = '';
      editPreview.style.display = 'none';
      editPreviewImg.src = '';
    });
  }
}

function setupFormHandlers() {
  // Add Class Form
  document
    .getElementById('addClassForm')
    .addEventListener('submit', async function (e) {
      e.preventDefault();

      const formData = new FormData(this);
      const progressBar = document.getElementById('addProgressBar');
      const progressContainer = document.getElementById('addUploadProgress');

      try {
        // Show progress bar if there's an image
        if (formData.get('scheduleImage') && formData.get('scheduleImage').size > 0) {
          progressContainer.style.display = 'block';
        }

        const xhr = new XMLHttpRequest();

        // Upload progress
        xhr.upload.addEventListener('progress', function (e) {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressBar.style.width = percentComplete + '%';
            progressBar.textContent = Math.round(percentComplete) + '%';
          }
        });

        // Upload complete
        xhr.addEventListener('load', function () {
          progressContainer.style.display = 'none';
          progressBar.style.width = '0%';
          progressBar.textContent = '0%';

          if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);
            showNotification('تم إضافة الفصل بنجاح', 'success');
            bootstrap.Modal.getInstance(
              document.getElementById('addClassModal')
            ).hide();
            document.getElementById('addClassForm').reset();
            document.getElementById('addImagePreview').style.display = 'none';
            loadClasses();
          } else {
            const result = JSON.parse(xhr.responseText);
            showNotification(result.error || 'حدث خطأ', 'danger');
          }
        });

        xhr.addEventListener('error', function () {
          progressContainer.style.display = 'none';
          showNotification('حدث خطأ في إضافة الفصل', 'danger');
        });

        xhr.open('POST', '/admin/add-class');
        xhr.send(formData);
      } catch (error) {
        console.error('Error adding class:', error);
        progressContainer.style.display = 'none';
        showNotification('حدث خطأ في إضافة الفصل', 'danger');
      }
    });

  // Edit Class Form
  document
    .getElementById('editClassForm')
    .addEventListener('submit', async function (e) {
      e.preventDefault();

      const classId = document.getElementById('editClassId').value;
      const formData = new FormData();
      
      formData.append('className', document.getElementById('editClassName').value);
      formData.append('academicLevel', document.getElementById('editAcademicLevel').value);
      formData.append('section', document.getElementById('editSection').value);
      formData.append('capacity', document.getElementById('editCapacity').value);
      formData.append('isActive', document.getElementById('editIsActive').checked);
      formData.append('notes', document.getElementById('editNotes').value);

      // Add image if selected
      const imageInput = document.getElementById('editScheduleImage');
      if (imageInput.files.length > 0) {
        formData.append('scheduleImage', imageInput.files[0]);
      }

      const progressBar = document.getElementById('editProgressBar');
      const progressContainer = document.getElementById('editUploadProgress');

      try {
        // Show progress bar if there's an image
        if (imageInput.files.length > 0) {
          progressContainer.style.display = 'block';
        }

        const xhr = new XMLHttpRequest();

        // Upload progress
        xhr.upload.addEventListener('progress', function (e) {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressBar.style.width = percentComplete + '%';
            progressBar.textContent = Math.round(percentComplete) + '%';
          }
        });

        // Upload complete
        xhr.addEventListener('load', function () {
          progressContainer.style.display = 'none';
          progressBar.style.width = '0%';
          progressBar.textContent = '0%';

          if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);
            showNotification('تم تحديث الفصل بنجاح', 'success');
            bootstrap.Modal.getInstance(
              document.getElementById('editClassModal')
            ).hide();
            loadClasses();
          } else {
            const result = JSON.parse(xhr.responseText);
            showNotification(result.error || 'حدث خطأ', 'danger');
          }
        });

        xhr.addEventListener('error', function () {
          progressContainer.style.display = 'none';
          showNotification('حدث خطأ في تحديث الفصل', 'danger');
        });

        xhr.open('PUT', `/admin/update-class/${classId}`);
        xhr.send(formData);
      } catch (error) {
        console.error('Error updating class:', error);
        progressContainer.style.display = 'none';
        showNotification('حدث خطأ في تحديث الفصل', 'danger');
      }
    });

  // Delete Current Image Button
  const deleteCurrentImageBtn = document.getElementById('deleteCurrentImage');
  if (deleteCurrentImageBtn) {
    deleteCurrentImageBtn.addEventListener('click', async function () {
      const classId = document.getElementById('editClassId').value;
      
      if (confirm('هل أنت متأكد من حذف صورة الجدول؟')) {
        try {
          const response = await fetch(`/admin/delete-schedule-image/${classId}`, {
            method: 'DELETE',
          });

          const result = await response.json();

          if (response.ok) {
            showNotification('تم حذف الصورة بنجاح', 'success');
            document.getElementById('editCurrentImage').style.display = 'none';
            document.getElementById('editCurrentImg').src = '';
          } else {
            showNotification(result.error || 'حدث خطأ في حذف الصورة', 'danger');
          }
        } catch (error) {
          console.error('Error deleting image:', error);
          showNotification('حدث خطأ في حذف الصورة', 'danger');
        }
      }
    });
  }
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

      // Handle schedule image
      const editCurrentImage = document.getElementById('editCurrentImage');
      const editCurrentImg = document.getElementById('editCurrentImg');
      const editImagePreview = document.getElementById('editImagePreview');
      
      if (cls.scheduleImage) {
        editCurrentImg.src = cls.scheduleImage;
        editCurrentImage.style.display = 'block';
      } else {
        editCurrentImage.style.display = 'none';
      }
      
      // Reset new image preview
      editImagePreview.style.display = 'none';
      document.getElementById('editScheduleImage').value = '';

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
