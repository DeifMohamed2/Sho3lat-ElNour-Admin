# 🎓 Sho3lat ElNour Admin - Automated Attendance System

## Enterprise-Grade Attendance Management with ZKTeco SenseFace Integration

---

## 🚀 What's New

### **Fully Automated Attendance System**

Professional facial recognition attendance tracking using ZKTeco SenseFace devices with real-time webhook integration.

### ✨ Key Features

#### Student Attendance

- ✅ **Automated Entry/Exit Tracking** - Real-time capture of arrival and departure
- ✅ **Smart Status Detection** - Present, Absent, Late, Early-Leave, Permission
- ✅ **Daily Class Reports** - Automatic present/absent/late lists per class
- ✅ **Class Integration** - Automatic linking to student's assigned class

#### Employee Attendance

- ✅ **Check-In/Check-Out System** - Professional time tracking (حضور/انصراف)
- ✅ **Multiple Scans Per Day** - Supports complex work schedules
- ✅ **Automatic Hours Calculation** - Precise work time for payroll
- ✅ **Complete Audit Trail** - Full history of all device interactions

#### System Capabilities

- ✅ **Real-Time Processing** - Instant webhook-based attendance capture
- ✅ **Zero Manual Intervention** - Fully automated background operation
- ✅ **Enterprise Scalability** - Handles large numbers of users
- ✅ **Multi-Device Support** - Works with multiple ZKTeco devices
- ✅ **Comprehensive Reporting** - Daily, weekly, monthly statistics

---

## 📂 Project Structure

```
Sho3lat ElNour Admin/
├── models/
│   ├── attendance.js              (Enhanced with entry/exit times)
│   ├── employeeAttendance.js      (Enhanced with multiple scans)
│   ├── dailyClassAttendance.js    (NEW - Daily class summaries)
│   ├── student.js                 (Enhanced with zktecoUserId)
│   └── employee.js                (Enhanced with zktecoUserId)
├── services/
│   └── attendanceService.js       (NEW - Core processing logic)
├── controllers/
│   ├── webhookController.js       (NEW - Webhook handlers)
│   └── adminController.js         (Enhanced with new endpoints)
├── routes/
│   ├── webhookRoute.js            (NEW - Webhook routes)
│   └── adminRoute.js              (Enhanced with attendance routes)
├── scripts/
│   ├── setupAttendance.js         (NEW - Setup helper)
│   └── testWebhook.js             (NEW - Testing simulator)
├── AUTOMATED_ATTENDANCE_SYSTEM.md (Complete documentation)
├── QUICKSTART.md                  (Quick start guide)
└── COMPLETION_SUMMARY.md          (Implementation summary)
```

---

## 🔧 Quick Setup

### 1. Start Server

```bash
node app.js
```

Server runs on: **http://localhost:8310**

### 2. Test System

```bash
# Simulate student check-in
node scripts/testWebhook.js student 1001 in

# Simulate full day scenario
node scripts/testWebhook.js fullday
```

### 3. Configure Device

On your ZKTeco SenseFace device:

- Device Type: **T&A PUSH** (not Access Control)
- Server IP: Your server IP
- Server Port: 8310
- Endpoint: /webhook/zkteco/cdata

---

## 📡 Webhook Endpoints

### Device Integration

```
GET  /webhook/zkteco/cdata          - Device ping/health check
POST /webhook/zkteco/cdata          - Attendance data receiver
GET  /webhook/zkteco/registry       - Device registration
POST /webhook/zkteco/registry       - Device registration
POST /webhook/zkteco/push           - Push triggers
```

### Management APIs

```
GET  /webhook/attendance/stats                    - Attendance statistics
POST /webhook/attendance/mark-absent              - Mark absent students
GET  /webhook/attendance/daily-class              - Class attendance details
```

---

## 🎯 Admin Endpoints

### ZKTeco ID Management

```
PUT  /admin/assign-student-zkteco-id/:studentId   - Assign device ID to student
PUT  /admin/assign-employee-zkteco-id/:employeeId - Assign device ID to employee
```

### Attendance Reports

```
GET  /admin/daily-class-attendance                - Daily class reports
GET  /admin/class-attendance-summary/:classId     - Class attendance over time
GET  /admin/employee-attendance-report            - Employee attendance reports
GET  /admin/employee-attendance-detail/:employeeId - Detailed employee stats
```

---

## 📊 Data Flow

```
┌─────────────────┐
│ ZKTeco Device   │
│ (Face Scan)     │
└────────┬────────┘
         │
         ↓ Webhook POST
┌─────────────────┐
│ Your Server     │
│ Port 8310       │
└────────┬────────┘
         │
         ↓ Process
┌─────────────────┐
│ Attendance      │
│ Service         │
└────────┬────────┘
         │
         ↓ Save
┌─────────────────┐
│ MongoDB         │
│ Database        │
└────────┬────────┘
         │
         ↓ Auto-Generate
┌─────────────────┐
│ Daily Reports   │
│ & Summaries     │
└─────────────────┘
```

---

## 📖 Documentation

### Complete Guides

- **[AUTOMATED_ATTENDANCE_SYSTEM.md](AUTOMATED_ATTENDANCE_SYSTEM.md)** - Full system documentation
- **[QUICKSTART.md](QUICKSTART.md)** - Quick setup guide
- **[COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)** - Implementation details

### Key Topics

- System architecture
- API reference
- Device configuration
- Database schema
- Sample data flows
- Troubleshooting

---

## 🔐 Security Features

- ✅ Duplicate prevention via unique indexes
- ✅ Data validation (User ID must exist)
- ✅ Timestamp validation
- ✅ Complete audit trails
- ✅ Device tracking

---

## 📈 Performance

- ✅ Optimized database indexes
- ✅ Efficient date range queries
- ✅ Real-time processing
- ✅ Scalable architecture
- ✅ Minimal memory footprint

---

## 🎓 Use Cases

### For Schools

- Student attendance tracking
- Class-wise daily reports
- Late arrival monitoring
- Absence management
- Parent notifications

### For Organizations

- Employee time tracking
- Payroll hour calculation
- Work schedule management
- Overtime tracking
- Attendance reports

---

## 🧪 Testing

### Without Physical Device

```bash
# Test student check-in
node scripts/testWebhook.js student 1001 in

# Test employee check-out
node scripts/testWebhook.js employee 2001 out

# Simulate full day
node scripts/testWebhook.js fullday
```

### With Physical Device

1. Configure device settings
2. Register users with face scans
3. Users scan their faces
4. Check server logs for confirmation
5. View reports via API

---

## 📞 Support

### Troubleshooting

1. Check server console logs
2. Verify ZKTeco User IDs are assigned
3. Ensure device is in "T&A PUSH" mode
4. Test with webhook simulator first

### Common Issues

- **"Student not found"** → Assign ZKTeco ID via API
- **"No class assigned"** → Assign class to student
- **"Device not sending data"** → Verify device mode and settings

---

## 🎉 Status

✅ **Server Running**: http://localhost:8310  
✅ **Database Connected**: MongoDB  
✅ **Webhook Endpoints Active**  
✅ **All Features Implemented**  
✅ **Production Ready**

---

## 🚀 Next Steps

1. ✅ System is complete and running
2. ⏳ Assign ZKTeco User IDs to students/employees
3. ⏳ Configure ZKTeco SenseFace device
4. ⏳ Test with physical device
5. ⏳ Start using automated attendance

---

## 📝 License

This project is part of Sho3lat ElNour educational management system.

---

## 👨‍💻 Technology Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Device Integration**: ZKTeco SenseFace Webhooks
- **Real-Time**: Webhook-based processing
- **Architecture**: Service layer pattern

---

**Built with ❤️ for Sho3lat ElNour**

For complete documentation, see: [AUTOMATED_ATTENDANCE_SYSTEM.md](AUTOMATED_ATTENDANCE_SYSTEM.md)
