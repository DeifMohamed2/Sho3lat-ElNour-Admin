// Fix for buffer-equal-constant-time compatibility issue
// Ensure Buffer is available globally before any modules load
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const mainRoute = require('./routes/mainRoute');
const adminRoute = require('./routes/adminRoute');
const parentRoute = require('./routes/parentRoute');
const webhookRoute = require('./routes/webhookRoute');

// express app
const app = express();

// CONECT to mongodb
// let io
// const dbURI = 'mongodb://localhost:27017/ElkablyCenter';

const dbURI = process.env.DATABASE_URL || 'mongodb://localhost:27017/sho3latElnour';
mongoose
  .connect(dbURI, {
    maxPoolSize: 10, // limit number of connections
  })
  .then((result) => {
    app.listen(8319);

    console.log('connected to db and listening on port http://localhost:8319 ');
  })
  .catch((err) => {
    console.log(err);
  });

// register view engine
app.set('view engine', 'ejs');
// listen for requests

app.use(cors());
// Parse JSON first for API routes
app.use(express.json()); // For JSON
app.use(express.urlencoded({ extended: true })); // For form-data
// ZKTeco devices send raw text, so handle text for webhook routes only
app.use('/webhook', express.text({ type: '*/*' })); // For raw text from ZKTeco webhooks only
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// let uri = ""; // Declare the 'uri' variable

app.use(
  session({
    secret: 'Keybord',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: dbURI,
    }),
  })
);

// Custom middlfsdfeware to make io accessible in all routes

// Serve the digital certificate
app.get('/assets/signing/digital-certificate.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/signing/digital-certificate.txt'));
});

app.use('/', mainRoute);
app.use('/admin', adminRoute);
app.use('/api/parent', parentRoute); // Parent Mobile API
app.use('/', webhookRoute); // ZKTeco Webhook Routes

app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});
