const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const passport = require("passport");
const apiRouter = require("./routes/api");
const session = require("express-session");
const bodyParser = require("body-parser");
const cors = require("cors");
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const https = require("https");

const cert = fs.readFileSync(
    path.resolve(__dirname, `./certs/${process.env.GN_CERT}`)
);
const agent = new https.Agent({ pfx: cert, passphprase: "" });
const credentials = Buffer.from(
    `${process.env.GN_CLIENT_ID}:${process.env.GN_CLIENT_SECRET}`
).toString("base64");

console.log(credentials, agent);
axios({
    method: "POST",
    url: `${process.env.GN_ENDPOINT}/oauth/token`,
    headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
    },
    httpsAgent: agent,
    data: {
        grant_type: "client_credentials",
    },
}).then(console.log);

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

app.use("/", apiRouter);

app.listen(5000, () => {
    console.log(`Example app listening on port 5000`);
});

module.exports = app;
