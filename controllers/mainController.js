const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

const homePage = (req, res) => {
  res.render('index', { title: 'Sho3lat Elnour System' });
};

const singIn = async (req, res) => {
  try {
    // Handle case where body might be a string (shouldn't happen after fix, but just in case)
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).send({ message: 'Invalid request format' });
      }
    }

    let { phoneNumber, password } = body;

    // Trim whitespace from phone number and password
    phoneNumber = phoneNumber ? String(phoneNumber).trim() : '';
    password = password ? String(password).trim() : '';

    // Validate input
    if (!phoneNumber || !password) {
      return res.status(400).send({ message: 'Phone number and password are required' });
    }

    // Find admin by phone number
    const admin = await Admin.findOne({ phoneNumber });

    if (!admin) {
      return res.status(404).send({ message: 'Admin not found with this phone number' });
    }

    // Check password
    if (admin.password !== password) {
      return res.status(401).send({ message: 'Invalid password' });
    }

    const token = jwt.sign({ adminId: admin._id }, jwtSecret);
    res.cookie('token', token, { httpOnly: true });
    return res.send(admin);
  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).send({ message: 'Internal server error during sign-in' });
  }
};

const addAdmin = (req, res) => {
  const admin = new Admin(req.body);
  admin
    .save()
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      console.error('Error adding admin:', err);
      res.status(500).send({ message: 'Error creating admin account' });
    });
};

module.exports = {
  homePage,
  addAdmin,
  singIn,
};
