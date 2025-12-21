// app.js

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

const app = express();

/* =======================
   DATABASE
======================= */
const dbURI =
  process.env.DATABASE_URL || 'mongodb://localhost:27017/sho3latElnour';

mongoose
  .connect(dbURI, { maxPoolSize: 10 })
  .then(() => {
    app.listen(8319, () => {
      console.log('✅ Server running on http://localhost:8319');
    });
  })
  .catch(console.error);

/* =======================
   VIEW ENGINE
======================= */
app.set('view engine', 'ejs');

/* =======================
   MIDDLEWARE (ORDER IS CRITICAL)
======================= */

// ZKTeco sends RAW TEXT
app.use('/iclock', express.text({ type: '*/*' }));

// Normal APIs
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.use(
  session({
    secret: 'Keybord',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: dbURI }),
  })
);

/* =======================
   ROUTES
======================= */
app.use('/', mainRoute);
app.use('/admin', adminRoute);
app.use('/api/parent', parentRoute);
app.use('/', webhookRoute);

/* =======================
   FALLBACK
======================= */
app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});
