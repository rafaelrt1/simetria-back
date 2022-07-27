const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const passport = require('passport');
const apiRouter = require('./routes/api');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

app.use(cors());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

function authenticationMiddleware(req, res, next) {
  console.log(req.isAuthenticated())
  if (req.isAuthenticated()) return next();
  res.json({fail:true});
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const MySQLStore = require('express-mysql-session')(session);
require('./auth')(passport);
app.use(session({
  key: 'session_cookie_name',
  secret: 'session_cookie_secret',
  store: new MySQLStore({
    host: process.env.HOST,
    port: 3306,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DB
  }),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 60 * 1000 }
}))
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", apiRouter);

app.listen(5000, () => {
  console.log(`Example app listening on port 5000`)
});

module.exports = app;