const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const Student = require('../models/student');
const Notification = require('../models/Notification');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

function initializeFirebase() {
  if (!firebaseInitialized) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Firebase Admin SDK:', error);
      throw error;
    }
  }
  return admin;
}

// Initialize on module load
initializeFirebase();

/**
 * Send notification to parent via student's FCM tokens
 * @param {String} studentId - Student ID
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 * @param {Object} data - Additional data payload
 * @param {String} notificationType - Type of notification (attendance, message, etc.)
 * @returns {Promise<Object>} - Result with success count and failures
 */
async function sendNotificationToParent(studentId, title, body, data = {}, notificationType = 'general') {
  try {
    // Get student with FCM tokens
    const student = await Student.findById(studentId).select('fcmTokens studentName parentName');
    
    if (!student) {
      throw new Error('Student not found');
    }

    if (!student.fcmTokens || student.fcmTokens.length === 0) {
      console.log(`⚠️ No FCM tokens found for student: ${student.studentName}`);
      return { success: 0, failures: 0, message: 'No FCM tokens registered' };
    }

    // Prepare notification payload
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        type: notificationType,
        studentId: studentId.toString(),
        studentName: student.studentName,
        timestamp: new Date().toISOString(),
        ...data,
      },
      tokens: student.fcmTokens,
    };

    // Send multicast message
    const response = await admin.messaging().sendEachForMulticast(message);

    // Remove invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          // Remove invalid or unregistered tokens
          if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(student.fcmTokens[idx]);
          }
        }
      });

      // Update student document to remove invalid tokens
      if (tokensToRemove.length > 0) {
        await Student.findByIdAndUpdate(studentId, {
          $pull: { fcmTokens: { $in: tokensToRemove } },
        });
        console.log(`🗑️ Removed ${tokensToRemove.length} invalid FCM tokens for student: ${student.studentName}`);
      }
    }

    // Create notification record in database
    await Notification.create({
      recipient: studentId,
      title: title,
      body: body,
      type: notificationType,
      data: data,
    });

    console.log(`✅ Sent notification to ${student.studentName}: ${response.successCount} success, ${response.failureCount} failures`);

    return {
      success: response.successCount,
      failures: response.failureCount,
      message: `Notification sent successfully`,
    };
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    throw error;
  }
}

/**
 * Send notification to multiple parents (batch)
 * @param {Array<String>} studentIds - Array of student IDs
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 * @param {Object} data - Additional data payload
 * @param {String} notificationType - Type of notification
 * @returns {Promise<Object>} - Aggregated results
 */
async function sendNotificationToMultipleParents(studentIds, title, body, data = {}, notificationType = 'message') {
  try {
    const results = {
      totalSuccess: 0,
      totalFailures: 0,
      studentResults: [],
    };

    // Send notifications in parallel
    const promises = studentIds.map(async (studentId) => {
      try {
        const result = await sendNotificationToParent(studentId, title, body, data, notificationType);
        results.totalSuccess += result.success;
        results.totalFailures += result.failures;
        results.studentResults.push({
          studentId,
          success: result.success,
          failures: result.failures,
        });
      } catch (error) {
        console.error(`Error sending to student ${studentId}:`, error);
        results.studentResults.push({
          studentId,
          success: 0,
          failures: 1,
          error: error.message,
        });
      }
    });

    await Promise.all(promises);

    console.log(`✅ Batch notification complete: ${results.totalSuccess} success, ${results.totalFailures} failures`);

    return results;
  } catch (error) {
    console.error('❌ Error in batch notification:', error);
    throw error;
  }
}

/**
 * Send custom message to parents by phone numbers
 * @param {Array<String>} phoneNumbers - Array of parent phone numbers
 * @param {String} title - Message title
 * @param {String} body - Message body
 * @returns {Promise<Object>} - Results
 */
async function sendCustomMessage(phoneNumbers, title, body) {
  try {
    // Find all students with matching parent phone numbers
    const students = await Student.find({
      $or: [
        { parentPhone1: { $in: phoneNumbers } },
        { parentPhone2: { $in: phoneNumbers } },
      ],
      isActive: true,
    }).select('_id studentName parentPhone1 parentPhone2');

    if (students.length === 0) {
      return {
        success: false,
        message: 'No students found for the provided phone numbers',
        totalSuccess: 0,
        totalFailures: 0,
      };
    }

    // Get unique student IDs (to avoid duplicate notifications for same parent)
    const uniqueStudentIds = [...new Set(students.map(s => s._id.toString()))];

    // Send notifications
    const results = await sendNotificationToMultipleParents(
      uniqueStudentIds,
      title,
      body,
      { source: 'admin_message' },
      'message'
    );

    return {
      success: true,
      message: `Message sent to ${students.length} students`,
      studentsNotified: students.length,
      ...results,
    };
  } catch (error) {
    console.error('❌ Error sending custom message:', error);
    throw error;
  }
}

/**
 * Send attendance notification
 * @param {String} studentId - Student ID
 * @param {String} status - Attendance status (Present, Late, Absent)
 * @param {Date} time - Time of attendance
 * @returns {Promise<Object>} - Result
 */
async function sendAttendanceNotification(studentId, status, time) {
  try {
    const student = await Student.findById(studentId).select('studentName');
    
    if (!student) {
      throw new Error('Student not found');
    }

    // Prepare notification based on status
    let title, body, notificationType;
    const timeStr = new Date(time).toLocaleTimeString('ar-EG', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    switch (status) {
      case 'Late':
        title = '⚠️ تأخير';
        body = `تأخر ${student.studentName} عن الحضور - الوقت: ${timeStr}`;
        notificationType = 'late';
        break;
      case 'Present':
        title = '✅ حضور';
        body = `حضر ${student.studentName} في الوقت المحدد - الوقت: ${timeStr}`;
        notificationType = 'present';
        break;
      case 'Absent':
        title = '❌ غياب';
        body = `${student.studentName} غائب اليوم`;
        notificationType = 'absent';
        break;
      default:
        title = 'إشعار حضور';
        body = `تحديث حضور ${student.studentName}`;
        notificationType = 'attendance';
    }

    // Send notification
    const result = await sendNotificationToParent(
      studentId,
      title,
      body,
      {
        status: status,
        time: time.toISOString(),
      },
      notificationType
    );

    return result;
  } catch (error) {
    console.error('❌ Error sending attendance notification:', error);
    throw error;
  }
}

module.exports = {
  initializeFirebase,
  sendNotificationToParent,
  sendNotificationToMultipleParents,
  sendCustomMessage,
  sendAttendanceNotification,
};
