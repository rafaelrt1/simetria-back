const express = require("express");
const router = express.Router();
const connection = require('../config/connectDb');
const passport = require('passport');
const bcrypt = require('bcrypt');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
require('dotenv').config();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// const hostHome= '10.0.0.19';
// const hostBruna = '192.168.0.199';

router.get('/servicos', async (req, res, next) => {
    try {
        connection.query("SELECT fs.idFuncionario, fs.idServico, s.nome as `servico`, s.precoMinimo, s.precoMaximo, s.duracaoMaxima, s.duracaoMaxima, f.nome as `funcionario` FROM funcionarios_servicos fs join servicos s on s.id = fs.idServico join funcionarios f on f.id = fs.idFuncionario where f.ativo = true order by s.nome", async function (err, rows, fields) {
            if (err)
                res.json({ error: "Não foi possível realizar esta operação" });
            else {
                const db = require('../db');
                const conn = await db.connect();
                const [options] = await conn.query("SELECT s.id, s.nome as `servico`, co.nome FROM servicos s join service_customer_options sco on sco.idServico=s.id join customer_options co on sco.idOpcao=co.id order by s.nome")
                rows.forEach((service) => {
                    service.options = [];
                    options.forEach((option) => {
                        if (service.idServico === option.id) {
                            return service.options.push(option.nome);
                        }
                    });
                });
                console.log(rows);
                res.json(rows);
            }
                
        }).end;
    } catch (e) {
        console.error(e);
    }
});

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
                if (err) {
                    if (err.errno === 1062)
                        res.json({ error: "Já existe uma conta cadastrada com este e-mail" });    
                    else res.json({ error: "Não foi possível realizar esta operação" });
                }
                else
                    res.json(rows);
            }).end;
        });
    }
    catch (e) {
        console.error(e)
    }
});

// passport.use(new GoogleStrategy({
//     clientID: GOOGLE_CLIENT_ID,
//     clientSecret: GOOGLE_CLIENT_SECRET,
//     callbackURL: `http://localhost:5000/auth/google/callback`,
//     passReqToCallback: true
// }, function verify(issuer, profile, cb) {
//     console.log(issuer) 
//     console.log(profile)
//     console.log(cb)
//     // db.get('SELECT * FROM google_credentials WHERE provider = ? AND subject = ?', 
//     //     [issuer, profile.id ], function(err, row) {
//     //         if (err) { return cb(err); }
//     //         if (!row) {
//     //             db.run('INSERT INTO usuarios (name) VALUES (?)', [profile.displayName], function(err) {
//     //                 if (err) { return cb(err); }
//     //                 var id = this.lastID;
//     //                 db.run('INSERT INTO google_credentials (user_id, provider, subject) VALUES (?, ?, ?)', 
//     //                 [
//     //                     id,
//     //                     issuer,
//     //                     profile.id
//     //                 ], function(err) {
//     //                     if (err) { return cb(err); }
//     //                     var user = {
//     //                         id: id,
//     //                         name: profile.displayName
//     //                     };
//     //                     return cb(null, user);
//     //                 });
//     //             });
//     //         } else {
//     //             db.get('SELECT * FROM usuarios WHERE id = ?', [ row.user_id ], function(err, row) {
//     //                 if (err) { return cb(err); }
//     //                 if (!row) { return cb(null, false); }
//     //                 return cb(null, row);
//     //             });
//     //         }
//     //     }
//     // )
//     }
// ));

// router.get('/auth/google',
//   passport.authenticate('google', { scope : ['profile', 'email']}, function verify(issuer, profile, cb) {
//     console.log(issuer, profile, cb)
//  })
// );
  
// router.get('/auth/google/callback',
//   passport.authenticate('google', { successRedirect: 'http://localhost:5000/', 
//   failureRedirect: "http://localhost:5000/"  }),
//   function(req, res) {
//     // Successful authentication, redirect success.
//     console.log(res)
//     res.redirect("http://localhost:5000/");
//     res.json({message: "Success"});
// });

module.exports = router;