// Import the necessary libraries
const express = require('express');
const router = express.Router();

// Import the necessary controllers

const mainController = require('../controllers/mainController.js');

// Define the routes

router.get('/', mainController.homePage);

router.post('/sign-in', mainController.singIn);

router.post('/add-admin', mainController.addAdmin);



module.exports = router;


