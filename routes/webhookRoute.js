// routes/webhookRoute.js

const express = require('express');
const router = express.Router();
const {
  handleZKTecoAttendance,
  handleZKTecoPing,
  handleZKTecoRegistry,
} = require('../controllers/webhookController');

// Attendance push
router.all('/iclock/cdata', handleZKTecoAttendance);

// Device polling
router.get('/iclock/getrequest', handleZKTecoPing);

// Registry / sync
router.all('/iclock/registry', handleZKTecoRegistry);

module.exports = router;
