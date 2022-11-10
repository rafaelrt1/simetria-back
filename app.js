const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const passport = require("passport");
const adminRouter = require("./routes/admin-api");
const apiRouter = require("./routes/api");
const session = require("express-session");
const bodyParser = require("body-parser");
const cors = require("cors");
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const port = process.env.PORT || 8000;

app.use(cors());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const MySQLStore = require("express-mysql-session")(session);
require("./auth")(passport);
app.use(
    session({
        key: process.env.KEY,
        secret: process.env.SESSION_SECRET,
        store: new MySQLStore({
            host: process.env.HOST,
            port: 3306,
            user: process.env.USER,
            password: process.env.PASSWORD,
            database: process.env.DB,
        }),
        resave: false,
        saveUninitialized: false,
    })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/admin", adminRouter);
app.use("/", apiRouter);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

module.exports = app;
