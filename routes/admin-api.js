const express = require("express");
const router = express.Router();
const connection = require("../config/connectDb");
const passport = require("passport");
const bcrypt = require("bcrypt");
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
const db = require("../db");

const checkPermission = async (user) => {
    const conn = await db.connect();
    if (!user) return false;
    else {
        const [userData] = await conn.query(
            `SELECT * FROM usuarios where id = ? and isAdmin = 1`,
            user
        );

        return userData?.length && userData[0]?.isAdmin;
    }
};

const getUser = async (token) => {
    const conn = await db.connect();
    if (!token) return false;
    else {
        const [userData] = await conn.query(
            `SELECT data FROM sessions where session_id = ?`,
            [token]
        );
        console.log(userData);
        const user = JSON.parse(userData[0].data);
        return checkPermission(user.passport.user);
    }
};

router.get("/servicos", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ erro: "Usuário deslogado" });
        }
        const conn = await db.connect();
        const [services] = await conn.query(`SELECT * FROM servicos;`);
        let response = [];
        services.forEach(async (service) => {
            const [professioanalAvailable] = await conn.query(
                `SELECT nome FROM funcionarios f join funcionarios_servicos fs on f.id = fs.idFuncionario where fs.idServico = ?;`,
                service.id
            );
            console.log(
                "Serviço: ",
                service.id,
                " profissoinais: ",
                professioanalAvailable
            );
        });
        // return res.json(employees);
        // const user = JSON.parse(userData[0].data);
        // return checkPermission(user.passport.user);
    } catch (e) {
        console.error(e);
    }
});

router.get("/funcionarios", async (req, res, next) => {
    try {
        console.log(req.headers.authorization);
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ erro: "Usuário deslogado" });
        }
        const conn = await db.connect();
        const [employees] = await conn.query(
            `SELECT id, nome FROM funcionarios`
        );
        return res.json(employees);
    } catch (e) {
        console.error(e);
    }
});

router.get("/permission", async (req, res, next) => {
    try {
        console.log(req.headers.authorization);
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ erro: "Usuário deslogado" });
        }
        res.json({});
    } catch (e) {
        console.error(e);
    }
});

router.post("/login", passport.authenticate("local"), function (req, res) {
    if (res.req.user.isAdmin) {
        return res.json({
            message: "Success",
            session: res.req.sessionID,
            userData: { name: res.req.user.nome, id: res.req.user.id },
        });
    } else {
        res.status(403);
        return res.json({ error: "Não permitido" });
    }
});

module.exports = router;
