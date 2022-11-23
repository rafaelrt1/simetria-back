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
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });
        return userData?.length && userData[0]?.isAdmin;
    }
};

const getProfessionals = async (id) => {
    const conn = await db.connect();
    const [professioanalsAvailableToService] = await conn.query(
        `SELECT f.id, f.nome FROM funcionarios f join funcionarios_servicos fs on f.id = fs.idFuncionario where fs.idServico = ?;`,
        id
    );
    conn.end(function (err) {
        if (err) throw err;
        else console.log("Closing connection.");
    });
    return professioanalsAvailableToService;
};

const getEmployees = async () => {
    try {
        const conn = await db.connect();
        const [employees] = await conn.query(
            `SELECT id, nome, ativo FROM funcionarios`
        );
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });
        return employees;
    } catch (e) {
        return e;
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
        if (!userData.length) return false;
        const user = JSON.parse(userData[0].data);
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });
        return checkPermission(user.passport.user);
    }
};

router.get("/servicos", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
        }
        const conn = await db.connect();
        const [services] = await conn.query(
            `SELECT s.id as 'idServico', s.nome as 'nome', s.precoMinimo, s.precoMaximo, s.duracaoMinima, s.complemento, s.instrucoes, s.pagavel, s.ativo, f.id, f.nome as 'funcionario' FROM servicos s
                join funcionarios_servicos fs on s.id = fs.idServico join funcionarios f on f.id = fs.idFuncionario;`
        );
        let response = [];
        services.forEach(async (service, index) => {
            let responseObj = {
                idServico: service.idServico,
                nome: service.nome,
                precoMinimo: service.precoMinimo,
                precoMaximo: service.precoMaximo,
                duracaoMinima: service.duracaoMinima,
                complemento: service.complemento,
                instrucoes: service.instrucoes,
                pagavel: service.pagavel,
                ativo: service.ativo,
                profissionais: [],
            };

            const filteredService = services.filter((serviceFilter) => {
                return service.idServico === serviceFilter.idServico;
            });

            filteredService.forEach((filteredService) => {
                responseObj.profissionais.push({
                    nome: filteredService.funcionario,
                    id: filteredService.id,
                });
            });
            response.push(responseObj);
        });
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });
        res.json(response);
    } catch (e) {
        console.error(e);
    }
});

router.post("/funcionario", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
        }
        if (
            !req.body.name ||
            req.body.active?.length < 1 ||
            isNaN(parseInt(req.body.active))
        ) {
            res.status(400);
            return res.json({ error: "Parâmetros incorretos" });
        }
        const conn = await db.connect();
        const [addEmployee] = await conn.query(
            `INSERT INTO funcionarios (nome, ativo) values (?,?)`,
            [req.body.name, req.body.active]
        );
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });
        return res.json(await getEmployees());
    } catch (e) {
        console.error(e);
    }
});

router.put("/funcionario", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
        }
        if (
            !req.body.name ||
            req.body.active?.length < 1 ||
            isNaN(parseInt(req.body.active) || !req.body.id)
        ) {
            res.status(400);
            return res.json({ error: "Parâmetros incorretos" });
        }
        const conn = await db.connect();
        const [employees] = await conn.query(
            `UPDATE funcionarios set nome = ?, ativo = ? where id = ?`,
            [req.body.name, req.body.active, req.body.id]
        );
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });
        return res.json(await getEmployees());
    } catch (e) {
        console.error(e);
    }
});

router.delete("/funcionarios", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
        }
        if (!req.body.itemsToDelete) {
            res.status(400);
            res.json({ error: "Informe o id do funcionário" });
        }
        const conn = await db.connect();
        let query = `DELETE FROM funcionarios where id = ?`;
        if (req.body.itemsToDelete.length > 1) {
            req.body.itemsToDelete.forEach((item, index) => {
                if (index === req.body.itemsToDelete.length - 1) return;
                query += ` or id = ?`;
            });
        }
        const [deletedEmployee] = await conn.query(
            query,
            req.body.itemsToDelete
        );
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });
        return res.json(await getEmployees());
    } catch (e) {
        console.error(e);
    }
});

router.get("/funcionarios", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
        }
        return res.json(await getEmployees());
    } catch (e) {
        console.error(e);
    }
});

router.get("/permission", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
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
