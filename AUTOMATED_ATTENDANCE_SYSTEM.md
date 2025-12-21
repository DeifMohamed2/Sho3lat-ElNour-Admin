# Automated Attendance System - ZKTeco SenseFace Integration

## Enterprise-Grade Attendance Management System

### 🎯 Overview

This system implements a fully automated, professional attendance tracking solution using ZKTeco SenseFace facial recognition devices. The system operates completely in the background via webhooks, eliminating any need for manual intervention.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Database Models](#database-models)
4. [API Endpoints](#api-endpoints)
5. [Device Configuration](#device-configuration)
6. [Setup Instructions](#setup-instructions)
7. [Usage Guide](#usage-guide)
8. [Advanced Features](#advanced-features)

---

## ✨ Features

### Student Attendance

- ✅ **Automated Entry/Exit Tracking** - Capture student arrival and departure times
- ✅ **Class Linking** - Automatic association with student's assigned class
- ✅ **Status Detection** - Present, Absent, Late, Early-Leave, Permission
- ✅ **Daily Class Reports** - Automatic generation of present/absent/late lists
- ✅ **Multi-Verification Support** - Face, Fingerprint, RFID, Password
- ✅ **Leave Management** - Track early departures with reasons

### Employee Attendance

- ✅ **Check-In/Check-Out System** - Professional time tracking (حضور/انصراف)
- ✅ **Multiple Scans Per Day** - Support for mid-day breaks
- ✅ **Accurate Timestamps** - Precise time tracking for payroll
- ✅ **Total Hours Calculation** - Automatic work hours computation
- ✅ **Late Detection** - Identify late arrivals automatically
- ✅ **Scan History** - Complete audit trail of all device interactions

### System Features

- ✅ **Real-Time Processing** - Instant webhook-based attendance capture
- ✅ **Zero Manual Intervention** - Fully automated background operation
- ✅ **Enterprise Scalability** - Handles large numbers of users efficiently
- ✅ **Data Integrity** - Duplicate prevention and validation
- ✅ **Comprehensive Reporting** - Daily, weekly, monthly statistics
- ✅ **Multi-Device Support** - Works with multiple ZKTeco devices

---

## 🏗️ Architecture

### System Flow

```
ZKTeco SenseFace Device
          ↓
    (Face Recognition)
          ↓
   Webhook POST Request
          ↓
  Your Server (Port 8310)
          ↓
 /webhook/zkteco/cdata
          ↓
   Attendance Service
          ↓
    Database Update
          ↓
 Daily Summary Generation
```

### Components

1. **ZKTeco Devices** - Capture biometric data and send webhooks
2. **Webhook Routes** (`/webhook/zkteco/*`) - Receive device data
3. **Attendance Service** - Process and validate attendance
4. **Database Models** - Store attendance records
5. **Admin API** - Manage users and view reports

---

## 🗄️ Database Models

### 1. Enhanced Student Model

```javascript
{
  studentName: String,
  studentCode: String (5 digits),
  zktecoUserId: String (unique), // ← NEW: Links to device
  class: ObjectId (Class),
  // ... other fields
}
```

### 2. Enhanced Employee Model

```javascript
{
  employeeName: String,
  employeeCode: String (6 digits),
  zktecoUserId: String (unique), // ← NEW: Links to device
  employeeType: String,
  // ... other fields
}
```

### 3. Student Attendance Model (Enhanced)

```javascript
{
  student: ObjectId,
  class: ObjectId,
  date: Date,
  status: String, // Present, Absent, Late, Early-Leave, Permission
  entryTime: Date,  // ← Entry scan timestamp
  exitTime: Date,   // ← Exit scan timestamp
  verifyMethod: String, // Face Recognition, Fingerprint, etc.
  deviceSN: String,
  isAutomated: Boolean,
  leaveReason: String,
  notes: String
}
```

### 4. Employee Attendance Model (Enhanced)

```javascript
{
  employee: ObjectId,
  date: Date,
  checkInTime: Date,    // ← First check-in
  checkOutTime: Date,   // ← Last check-out
  scans: [{             // ← All scans throughout the day
    scanTime: Date,
    scanType: String,   // Check In / Check Out
    verifyMethod: String,
    deviceSN: String
  }],
  totalHours: Number,
  status: String, // Present, Absent, Late, Half-Day, On-Leave
  isAutomated: Boolean
}
```

### 5. Daily Class Attendance Model (NEW)

```javascript
{
  class: ObjectId,
  date: Date,
  presentStudents: [{
    student: ObjectId,
    entryTime: Date,
    exitTime: Date
  }],
  absentStudents: [{ student: ObjectId }],
  lateStudents: [{
    student: ObjectId,
    entryTime: Date,
    minutesLate: Number
  }],
  earlyLeaveStudents: [{
    student: ObjectId,
    exitTime: Date,
    reason: String
  }],
  totalStudents: Number,
  presentCount: Number,
  absentCount: Number,
  lateCount: Number,
  attendanceRate: Number // Percentage
}
```

---

## 🔌 API Endpoints

### Webhook Endpoints (For ZKTeco Devices)

#### Device Ping/Health Check

```
GET /webhook/zkteco/cdata?SN=DeviceSerialNumber
Response: OK
```

#### Attendance Data Receiver

```
POST /webhook/zkteco/cdata
Content-Type: text/plain OR application/json

Text Format (Tab-separated):
UserID    DateTime              Status  Verify
1001      2025-12-20 08:30:45  0       15

JSON Format:
{
  "PIN": "1001",
  "DateTime": "2025-12-20 08:30:45",
  "Status": "0",
  "Verify": "15"
}

Response: OK
```

#### Device Registration

```
GET/POST /webhook/zkteco/registry
Response: OK
```

### Admin API Endpoints

#### Assign ZKTeco ID to Student

```
PUT /admin/assign-student-zkteco-id/:studentId
Body: { "zktecoUserId": "1001" }
```

#### Assign ZKTeco ID to Employee

```
PUT /admin/assign-employee-zkteco-id/:employeeId
Body: { "zktecoUserId": "2001" }
```

#### Get Daily Class Attendance Report

```
GET /admin/daily-class-attendance?date=2025-12-20
Response: {
  success: true,
  date: "2025-12-20",
  reports: [...]
}
```

#### Get Class Attendance Summary

```
GET /admin/class-attendance-summary/:classId?startDate=2025-12-01&endDate=2025-12-20
Response: {
  success: true,
  avgAttendanceRate: 92.5,
  summaries: [...]
}
```

#### Get Employee Attendance Report

```
GET /admin/employee-attendance-report?startDate=2025-12-01&endDate=2025-12-20
Response: {
  success: true,
  summary: [...]
}
```

#### Get Employee Attendance Detail

```
GET /admin/employee-attendance-detail/:employeeId?startDate=2025-12-01&endDate=2025-12-20
Response: {
  success: true,
  statistics: {
    totalDays: 20,
    totalHours: 160,
    avgHoursPerDay: 8
  },
  attendances: [...]
}
```

#### Get Attendance Statistics

```
GET /webhook/attendance/stats?date=2025-12-20
Response: {
  success: true,
  stats: {
    totalStudentAttendance: 150,
    totalEmployeeAttendance: 25,
    classAttendance: [...]
  }
}
```

#### Mark Absent Students (Manual Trigger)

```
POST /webhook/attendance/mark-absent
Body: { "date": "2025-12-20" }
```

---

## 🔧 Device Configuration

### ZKTeco SenseFace Device Setup

1. **Access Device Settings**
   - Navigate to: Menu → System → Communication
2. **Set Device Type**
   - Change mode from "Access Control" to **"T&A PUSH"**
   - This is critical for attendance tracking
3. **Configure Push Server**

   ```
   Push Server IP: YOUR_SERVER_IP (e.g., 192.168.1.100)
   Push Server Port: 8310
   Push Endpoint: /webhook/zkteco/cdata
   ```

4. **Enable Push Mode**

   - Turn ON real-time push
   - Set push interval (recommended: immediate)

5. **Test Connection**
   - Device should ping: `http://YOUR_IP:8310/webhook/zkteco/cdata`
   - Check server logs for "✓ Device ping from..."

### Verification Codes

- `0` = Password
- `1` = Fingerprint
- `4` = RFID Card
- `15` = Face Recognition

### Status Codes

- `0` = Check In
- `1` = Check Out

---

## 🚀 Setup Instructions

### 1. Install Dependencies

Already installed in your project. No additional packages needed.

### 2. Database Models

All models are already created:

- `/models/student.js` - Enhanced with `zktecoUserId`
- `/models/employee.js` - Enhanced with `zktecoUserId`
- `/models/attendance.js` - Enhanced with entry/exit times
- `/models/employeeAttendance.js` - Enhanced with multiple scans
- `/models/dailyClassAttendance.js` - NEW model for class summaries

### 3. Service Layer

- `/services/attendanceService.js` - Core processing logic

### 4. Controllers

- `/controllers/webhookController.js` - Webhook handlers
- `/controllers/adminController.js` - Enhanced with new functions

### 5. Routes

- `/routes/webhookRoute.js` - Webhook routes
- `/routes/adminRoute.js` - Enhanced with new endpoints

### 6. Application Integration

Your `app.js` already includes:

```javascript
app.use('/webhook', webhookRoute);
```

### 7. Start Server

```bash
cd "/Users/deifmohamed/Desktop/Sho3lat Elnour/Sho3lat ElNour Admin"
node app.js
```

Server will start on: `http://localhost:8310`

---

## 📖 Usage Guide

### Step 1: Assign ZKTeco IDs

#### For Students:

1. Add student via admin panel
2. Note the generated Student Code
3. Assign ZKTeco User ID:
   ```bash
   PUT /admin/assign-student-zkteco-id/STUDENT_MONGODB_ID
   Body: { "zktecoUserId": "1001" }
   ```
4. Register this User ID (1001) in the ZKTeco device with face scan

#### For Employees:

1. Add employee via admin panel
2. Note the generated Employee Code
3. Assign ZKTeco User ID:
   ```bash
   PUT /admin/assign-employee-zkteco-id/EMPLOYEE_MONGODB_ID
   Body: { "zktecoUserId": "2001" }
   ```
4. Register this User ID (2001) in the ZKTeco device with face scan

### Step 2: Configure Device

Follow [Device Configuration](#device-configuration) section above.

### Step 3: Test Attendance

1. Have a student/employee scan their face
2. Check server console logs for:
   ```
   🎓 Processing STUDENT attendance
   ✅ Found student: [Name]
   ✅ Attendance saved successfully
   ```

### Step 4: View Reports

- Daily class reports: `/admin/daily-class-attendance?date=2025-12-20`
- Employee reports: `/admin/employee-attendance-report`

---

## 🔥 Advanced Features

### Automatic Absent Marking

Run at end of day (can be automated with cron):

```bash
POST /webhook/attendance/mark-absent
Body: { "date": "2025-12-20" }
```

This will:

- Find all students who didn't scan
- Mark them as absent
- Update class attendance summaries

### Multi-Device Support

System supports multiple ZKTeco devices:

- Each scan includes `deviceSN`
- Track which device was used
- Useful for multiple building entries

### Attendance Modification History

When admin manually corrects attendance:

- Original status preserved
- Modification history tracked
- Audit trail maintained

### Late Threshold Configuration

Currently set to:

- Students: 8:15 AM
- Employees: 8:15 AM

To modify, edit `/services/attendanceService.js`:

```javascript
const classStartHour = 8; // Change hour
const scanHour = scanTime.getHours();
const scanMinute = scanTime.getMinutes();

if (
  scanHour > classStartHour ||
  (scanHour === classStartHour && scanMinute > 15)
) {
  attendance.status = 'Late';
}
```

### Employee Hour Tracking

For payroll calculations:

```javascript
// Automatic calculation
totalHours = (checkOutTime - checkInTime) / 3600000;
```

Access via: `/admin/employee-attendance-detail/:employeeId`

---

## 📊 Sample Data Flow

### Student Arrival (8:30 AM)

1. Student scans face → Device recognizes User ID `1001`
2. Device sends: `POST /webhook/zkteco/cdata`
   ```
   1001    2025-12-20 08:30:45    0    15
   ```
3. System finds student by `zktecoUserId: "1001"`
4. Creates attendance record:
   ```javascript
   {
     student: ObjectId("..."),
     class: ObjectId("..."),
     date: "2025-12-20 00:00:00",
     status: "Late", // After 8:15 AM
     entryTime: "2025-12-20 08:30:45",
     verifyMethod: "Face Recognition"
   }
   ```
5. Updates daily class attendance summary

### Student Departure (2:30 PM)

1. Student scans face again
2. Device sends: `POST /webhook/zkteco/cdata`
   ```
   1001    2025-12-20 14:30:15    1    15
   ```
3. System updates existing attendance:
   ```javascript
   {
     ...
     exitTime: "2025-12-20 14:30:15"
   }
   ```

### Employee Full Day

1. **Check-in (8:00 AM)**

   ```javascript
   {
     employee: ObjectId("..."),
     date: "2025-12-20",
     checkInTime: "08:00:00",
     scans: [{
       scanTime: "08:00:00",
       scanType: "Check In"
     }]
   }
   ```

2. **Lunch Break Out (12:00 PM)**

   ```javascript
   {
     scans: [
       { scanTime: '08:00:00', scanType: 'Check In' },
       { scanTime: '12:00:00', scanType: 'Check Out' },
     ];
   }
   ```

3. **Lunch Break In (1:00 PM)**

   ```javascript
   {
     scans: [
       { scanTime: '08:00:00', scanType: 'Check In' },
       { scanTime: '12:00:00', scanType: 'Check Out' },
       { scanTime: '13:00:00', scanType: 'Check In' },
     ];
   }
   ```

4. **Check-out (5:00 PM)**
   ```javascript
   {
     checkInTime: "08:00:00",
     checkOutTime: "17:00:00",
     totalHours: 9, // 17:00 - 08:00
     scans: [
       { scanTime: "08:00:00", scanType: "Check In" },
       { scanTime: "12:00:00", scanType: "Check Out" },
       { scanTime: "13:00:00", scanType: "Check In" },
       { scanTime: "17:00:00", scanType: "Check Out" }
     ]
   }
   ```

---

## 🔐 Security Considerations

### Webhook Security

- Endpoint is public (required by device)
- Consider adding IP whitelisting for ZKTeco devices
- Validate all incoming data
- Prevent duplicate submissions (already implemented)

### Data Validation

- User ID must exist in database
- Timestamps must be reasonable
- Duplicate prevention via unique indexes
- Date boundaries enforced

---

## 🐛 Troubleshooting

### Device Not Sending Data

1. Check device network connection
2. Verify server IP and port configuration
3. Ensure device is in "T&A PUSH" mode
4. Check firewall settings (port 8310)
5. Review server logs for ping attempts

### Attendance Not Recording

1. Verify `zktecoUserId` is assigned to student/employee
2. Check User ID is registered in device
3. Review server console logs
4. Ensure student has active class assignment

### Missing Students in Report

1. Run absent marking: `POST /webhook/attendance/mark-absent`
2. Verify class assignment
3. Check date range in query

---

## 📞 Support

For issues or questions:

1. Check server console logs
2. Review this documentation
3. Verify device configuration
4. Test with single user first

---

## 🎉 Summary

You now have a **fully automated, enterprise-grade attendance system** that:

✅ Captures attendance in real-time via facial recognition  
✅ Supports both students and employees  
✅ Tracks entry/exit with precise timestamps  
✅ Generates daily class reports automatically  
✅ Calculates work hours for payroll  
✅ Operates completely in the background  
✅ Scales to large organizations  
✅ Maintains complete audit trails

**The system is production-ready and enterprise-grade!** 🚀
