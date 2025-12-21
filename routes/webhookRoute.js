const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// ZKTeco Device Push Protocol Endpoints
// These endpoints receive data automatically from ZKTeco devices via ADMS/Push Protocol

// Main endpoint for attendance data (ZKTeco standard: /iclock/cdata)
// ZKTeco devices automatically send POST/GET requests here when someone scans
router.all('/iclock/cdata', webhookController.handleZKTecoAttendance);

// Alternative endpoint (some devices use this)
router.all('/zkteco/cdata', webhookController.handleZKTecoAttendance);

// Device ping/health check endpoint
router.get('/iclock/getrequest', webhookController.handleZKTecoPing);
router.get('/zkteco/ping', webhookController.handleZKTecoPing);

// Device registry endpoint
router.all('/iclock/registry', webhookController.handleZKTecoRegistry);

module.exports = router;

