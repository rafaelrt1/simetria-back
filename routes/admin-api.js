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

router.get("/lista-servicos", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
        }
        const conn = await db.connect();
        const [services] = await conn.query(
            `SELECT id, nome FROM servicos where ativo = 1;`
        );
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });
        res.json(services);
    } catch (e) {
        console.error(e);
    }
});

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

router.get("/agenda-profissional", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
        }
        if (!new Date(req.query.data) || req.query.data === "NaN-NaN-NaN") {
            res.status(400);
            return res.json([]);
        }
        const conn = await db.connect();

        const [reserves] = await conn.query(
            `SELECT a.id, a.dataInicio, a.dataFim, u.nome as 'cliente', s.nome as 'servico', s.id as 'idServico', a.pago, a.valor from agendamentos a join servicos s on s.id = a.idServico join usuarios u on a.cliente = u.id where a.idFuncionario = ? and a.data = ? order by a.dataInicio`,
            [req.query.funcionario, req.query.data]
        );

        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });

        res.json(reserves);
    } catch (e) {
        console.error(e);
    }
});

router.get("/clientes", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
        }

        const conn = await db.connect();

        const [clients] = await conn.query(
            `SELECT id, nome, email, emailGoogle from usuarios`
        );

        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });

        res.json(clients);
    } catch (e) {
        console.error(e);
    }
});

router.post("/agendamento", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
        }

        const clientAlreadyRegistered = parseInt(req.body.client)
            ? true
            : false;
        const beginTime = req.body.beginTime;
        const date = req.body.date;
        const endTime = req.body.endTime;
        const professional = parseInt(req.body.professional);
        const service = parseInt(req.body.service);
        const paid = req.body.paid === true ? "1" : "0";
        let client = req.body.client;

        const conn = await db.connect();

        if (!clientAlreadyRegistered) {
            const [newClient] = await conn.query(
                `INSERT INTO usuarios(email, senha, celular, nome, isAdmin) VALUES (${null}, ${null}, ${null}, ?, 0);`,
                [client]
            );
            client = newClient["insertId"];
        }

        const [servicePrice] = await conn.query(
            `SELECT precoMinimo FROM servicos where id = ?`,
            service
        );

        const [reserve] = await conn.query(
            `INSERT INTO agendamentos(dataInicio, idFuncionario, idServico, dataFim, data, cliente, valor, pago) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                beginTime,
                professional,
                service,
                endTime,
                date,
                client,
                servicePrice[0].precoMinimo,
                paid,
            ]
        );

        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });

        res.json("Adicionado");
    } catch (e) {
        console.error(e);
    }
});

router.put("/agendamento", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
        }

        const agendamento = parseInt(req.body.agendamento);
        const beginTime = req.body.beginTime;
        const date = req.body.date;
        const endTime = req.body.endTime;
        const professional = parseInt(req.body.professional);
        const service = parseInt(req.body.service);
        const paid = req.body.paid === true ? "1" : "0";

        const conn = await db.connect();

        const [reserve] = await conn.query(
            `UPDATE agendamentos SET dataInicio = ?, idFuncionario = ?, idServico = ?, dataFim = ?, data = ?, pago = ? where id = ?;`,
            [beginTime, professional, service, endTime, date, paid, agendamento]
        );

        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });

        res.json("Sucesso");
    } catch (e) {
        console.error(e);
    }
});

router.delete("/agendamento", async (req, res, next) => {
    try {
        let isAuthorized = await getUser(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ error: "Usuário deslogado" });
        }

        if (!req.body.id) {
            res.status(400);
            res.json({ erro: "Informe o ID do agendamento" });
        }

        const conn = await db.connect();

        const [deletedReserveCobs] = await conn.query(
            `DELETE FROM cobrancas where idAgendamento = ?`,
            [req.body.id]
        );

        const [deletedReserve] = await conn.query(
            `DELETE FROM agendamentos where id = ?`,
            [req.body.id]
        );

        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });

        res.json("Ok");
    } catch (e) {
        console.error(e);
        res.json({ erro: "Erro ao cancelar o agendamento ", e });
    }
});

module.exports = router;
