const express = require("express");
const router = express.Router();
const connection = require('../config/connectDb');
const passport = require('passport');
const bcrypt = require('bcrypt');

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/login', 
    failureMessage: "Error"
}), function(req, res) {
        res.json({message: "Success", session: res.req.sessionID });
});

router.post('/register', function (req, res, next) {
    try {
        let email = req.body.email.toString();
        let cell = req.body.cell.toString();
        let name = req.body.name.toString();
        bcrypt.hash(req.body.pass.toString(), 10, function(err, hash) {
            connection.query("Insert into usuarios(email, senha, celular, nome) values (?, ?, ?, ?);", [email, hash, cell, name], function (err, rows, fields) {
                if (err)
                    res.json({ error: "Não foi possível realizar esta operação" });
                else
                    res.json(rows);
            }).end;
        });
    }
    catch (e) {
        console.error(e)
    }
});

module.exports = router;