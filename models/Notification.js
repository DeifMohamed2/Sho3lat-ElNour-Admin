const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'Student', // Notifications are typically targeted at students (or their parents via student context)
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'attendance',    // General attendance
        'late',          // Student arrived late
        'present',       // Student present on time
        'absent',        // Student absent
        'message',       // Custom admin message
        'grade',         // Grade notification
        'financial',     // Financial notification
        'announcement',  // School announcement
        'general'        // General notification
      ],
      default: 'general',
    },
    data: {
      type: Map,
      of: String, // Optional additional data payload (e.g., related IDs)
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 }); // Helper for fetching recent
notificationSchema.index({ recipient: 1, isRead: 1 });   // Helper for unread count

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
