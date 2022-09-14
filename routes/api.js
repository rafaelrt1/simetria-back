const express = require("express");
const router = express.Router();
const connection = require('../config/connectDb');
const passport = require('passport');
const bcrypt = require('bcrypt');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
require('dotenv').config();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

router.get('/horarios', async (req, res, next) => {
    try {
        let profissional = req.query.profissional;
        let servico = req.query.servico;
        let data = req.query.data;
        let formattedDate = new Date(data+'UTC-3');

        const isValidDate = () => {
            return (
            formattedDate >= new Date().setHours(0, 0, 0, 0) &&
            formattedDate.getDay() !== 0 &&
            formattedDate.getDay() !== 1
            );
        };

        let isValid = profissional && servico && isValidDate();

        if (!isValid) {
            return res.json({error: "Busca inválida"});
        }

        formattedDate = formattedDate.getFullYear() +'-' + (formattedDate.getMonth()+1) +'-' + formattedDate.getDate();
   
        connection.query("SELECT * FROM agendamentos where idFuncionario = ? and idServico = ? and data = ?;", [profissional, servico, formattedDate], async function (err, rows, fields) {
            if (err)
                res.json({ error: "Não foi possível realizar esta operação" });
            else {
                res.json(rows);
            }
                
        }).end;
    } catch (e) {
        console.error(e);
    }
});

router.get('/servicos', async (req, res, next) => {
    try {
        connection.query("SELECT fs.idFuncionario, fs.idServico, s.nome as `servico`, s.precoMinimo, s.precoMaximo, s.duracaoMinima, s.duracaoMaxima, f.nome as `funcionario`, s.instrucoes, s.complemento FROM funcionarios_servicos fs join servicos s on s.id = fs.idServico join funcionarios f on f.id = fs.idFuncionario where f.ativo = true order by s.nome", async function (err, rows, fields) {
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


module.exports = router;