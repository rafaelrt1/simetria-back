const express = require("express");
const router = express.Router();
const connection = require("../config/connectDb");
const passport = require("passport");
const bcrypt = require("bcrypt");
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
const db = require("../db");
const moment = require("moment");
const GNRequest = require("../gerencianet");

let DEFAULT_CLOSING_TIME_MORNING_WEEKEND = "12:00";
let DEFAULT_CLOSING_TIME_AFTERNOON_WEEKEND = "17:00";
let DEFAULT_CLOSING_TIME_WEEK = "18:30";

let WEEK_DAYS_OPENING_HOURS = [
    { time: "13:30" },
    { time: "14:00" },
    { time: "14:30" },
    { time: "15:00" },
    { time: "15:30" },
    { time: "16:00" },
    { time: "16:30" },
    { time: "17:00" },
    { time: "17:30" },
    { time: "18:00" },
];

let WEEKEND_DAYS_OPENING_HOURS_AFTERNOON = [
    { time: "13:00" },
    { time: "13:30" },
    { time: "14:00" },
    { time: "14:30" },
    { time: "15:00" },
    { time: "15:30" },
    { time: "16:00" },
    { time: "16:30" },
];
let WEEKEND_DAYS_OPENING_HOURS_MORNING = [
    { time: "08:00" },
    { time: "08:30" },
    { time: "09:00" },
    { time: "09:30" },
    { time: "10:00" },
    { time: "10:30" },
    { time: "11:00" },
    { time: "11:30" },
];

const alreadyHasProfessional = (timeReserved, timesReserved) => {
    return timesReserved.some((time) => {
        return time.id === timeReserved.id;
    });
};

const checkPermission = async (token) => {
    if (!token) return false;
    else {
        const conn = await db.connect();
        const [userData] = await conn.query(
            `SELECT data FROM sessions where session_id = ?`,
            [token]
        );
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });

        return userData?.length;
    }
};

const getTimeOptions = (date, serviceDuration, timeReserved) => {
    const weekDay = new Date(date).getDay();
    const hoursDuration = serviceDuration.split(":")[0];
    const minutesDuration = serviceDuration.split(":")[1];
    let timesAvailable = [];

    if (weekDay !== 6) {
        WEEK_DAYS_OPENING_HOURS.forEach((day) => {
            const startTimeHours = day.time.split(":")[0];
            const startTimeMinutes = day.time.split(":")[1];
            const closingHours = DEFAULT_CLOSING_TIME_WEEK.split(":")[0];
            const closingMinutes = DEFAULT_CLOSING_TIME_WEEK.split(":")[1];

            const dateClosingToday = moment(
                date.setHours(closingHours, closingMinutes)
            );

            let dateBegining = moment(
                date.setHours(startTimeHours, startTimeMinutes)
            );
            if (dateBegining.isSameOrBefore(moment(new Date()))) {
                return;
            }
            console.log(dateBegining);
            const dateEnd = moment(dateBegining)
                .add(hoursDuration, "hours")
                .add(minutesDuration, "minutes");

            let times = [];

            if (
                dateClosingToday.isSameOrAfter(dateEnd) &&
                dateBegining.isAfter(moment(new Date()))
            ) {
                times.push(dateBegining);
                for (let i = 0; dateEnd >= dateBegining; i++) {
                    times.push(dateBegining);
                    dateBegining = moment(dateBegining).add(30, "minutes");
                }
                return timesAvailable.push({ time: day.time, hours: times });
            }
        });
    } else {
        WEEKEND_DAYS_OPENING_HOURS_MORNING.forEach((day) => {
            const startTimeHours = day.time.split(":")[0];
            const startTimeMinutes = day.time.split(":")[1];
            const closingHours =
                DEFAULT_CLOSING_TIME_MORNING_WEEKEND.split(":")[0];
            const closingMinutes =
                DEFAULT_CLOSING_TIME_MORNING_WEEKEND.split(":")[1];

            const dateClosingToday = moment(
                date.setHours(closingHours, closingMinutes)
            );

            let dateBegining = moment(
                date.setHours(startTimeHours, startTimeMinutes)
            );

            if (dateBegining.isSameOrBefore(moment(new Date()))) {
                return;
            }
            console.log(dateBegining);
            const dateEnd = moment(dateBegining)
                .add(hoursDuration, "hours")
                .add(minutesDuration, "minutes");

            let times = [];

            if (dateClosingToday.isSameOrAfter(dateEnd)) {
                times.push(dateBegining);
                for (let i = 0; dateEnd >= dateBegining; i++) {
                    times.push(dateBegining);
                    dateBegining = moment(dateBegining).add(30, "minutes");
                }
                return timesAvailable.push({ time: day.time, hours: times });
            }
        });
        WEEKEND_DAYS_OPENING_HOURS_AFTERNOON.forEach((day) => {
            const startTimeHours = day.time.split(":")[0];
            const startTimeMinutes = day.time.split(":")[1];
            const closingHours =
                DEFAULT_CLOSING_TIME_AFTERNOON_WEEKEND.split(":")[0];
            const closingMinutes =
                DEFAULT_CLOSING_TIME_AFTERNOON_WEEKEND.split(":")[1];

            const dateClosingToday = moment(
                date.setHours(closingHours, closingMinutes)
            );

            let dateBegining = moment(
                date.setHours(startTimeHours, startTimeMinutes)
            );
            console.log(dateBegining, new Date());
            if (dateBegining.isSameOrBefore(moment(new Date()))) {
                return;
            }
            console.log(dateBegining);
            const dateEnd = moment(dateBegining)
                .add(hoursDuration, "hours")
                .add(minutesDuration, "minutes");

            let times = [];

            if (dateClosingToday.isSameOrAfter(dateEnd)) {
                times.push(dateBegining);
                for (let i = 0; dateEnd >= dateBegining; i++) {
                    times.push(dateBegining);
                    dateBegining = moment(dateBegining).add(30, "minutes");
                }
                return timesAvailable.push({ time: day.time, hours: times });
            }
        });
    }
    let response = [];

    const pushedValue = (timesAvailable, availableTime) => {
        return timesAvailable.some((time) => {
            return time === availableTime;
        });
    };

    const timeAlreadyReserved = (timeBegin, timeEnd, timeReserved) => {
        return timeReserved.some((unavailableTime) => {
            let beginTimeReserved = moment(unavailableTime.begin);
            let endTimeReserved = moment(unavailableTime.end);
            return (
                timeBegin.isBetween(beginTimeReserved, endTimeReserved) ||
                timeEnd.isBetween(beginTimeReserved, endTimeReserved) ||
                moment(timeBegin).isSame(beginTimeReserved)
            );
        });
    };

    timesAvailable.forEach((availableTime, index) => {
        if (!timeReserved?.length) {
            response.push(availableTime.time);
        } else {
            timeReserved.forEach((unavailableTime) => {
                let beginTimeReserved = moment(unavailableTime.begin);
                let endTimeReserved = moment(unavailableTime.end);
                let timeBegin = moment(
                    new Date(date).setHours(
                        availableTime.time.split(":")[0],
                        availableTime.time.split(":")[1]
                    )
                );

                let timeEnd = moment(timeBegin)
                    .add(hoursDuration, "hours")
                    .add(minutesDuration, "minutes");
                console.log(timeReserved);
                let alreadyReservedInterval = availableTime.hours.some(
                    (hour) => {
                        console.log(hour, beginTimeReserved, endTimeReserved);
                        return hour.isBetween(
                            beginTimeReserved,
                            endTimeReserved
                        );
                    }
                );

                if (
                    !timeAlreadyReserved(timeBegin, timeEnd, timeReserved) &&
                    !alreadyReservedInterval &&
                    !pushedValue(response, availableTime.time)
                ) {
                    response.push(availableTime.time);
                }
            });
        }
    });
    return response;
};

const mountAvailableTimes = async (servico, timeReserved, date) => {
    const weekDay = new Date(date).getDay();
    const conn = await db.connect();
    const [serviceDuration] = await conn.query(
        `SELECT coalesce(duracaoMaxima, duracaoMinima) as 'tempo' FROM servicos where id = ?`,
        [servico]
    );
    const [employeesAvailable] = await conn.query(
        `SELECT f.id, f.nome as 'name' FROM servicos s join funcionarios_servicos fs on fs.idServico = s.id join funcionarios f on f.id = fs.idFuncionario where s.id = ?`,
        [servico]
    );

    let response = [];
    employeesAvailable.forEach((employee) => {
        response.push({
            employee: employee.id,
            employeeName: employee.name,
            availableTimes: [],
        });
    });
    response.forEach((employee) => {
        let filteredTimes = timeReserved.filter((time) => {
            return time.id === employee.employee;
        });
        employee.availableTimes = getTimeOptions(
            date,
            serviceDuration[0].tempo,
            filteredTimes[0] ? filteredTimes[0].professionalReservedTimes : []
        );
    });
    let result = response.filter((employee) => {
        return employee.availableTimes?.length > 0;
    });
    if (!result[0]) {
        return { error: "Nenhum horário disponível" };
    }
    conn.end(function (err) {
        if (err) throw err;
        else console.log("Closing connection.");
    });
    return result;
};

router.get("/horarios", async (req, res, next) => {
    try {
        let isAuthorized = await checkPermission(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ erro: "Usuário deslogado" });
        }
        let professional = req.query.profissional;
        let service = req.query.servico;
        let date = req.query.data;
        let timesReserved = [];

        const isValidDate = () => {
            return (
                new Date(date + "UTC-3") >= new Date().setHours(0, 0, 0, 0) &&
                new Date(date + "UTC-3").getDay() !== 0 &&
                new Date(date + "UTC-3").getDay() !== 1
            );
        };

        let isValid = service && isValidDate();

        if (!isValid) {
            return res.json({ error: "Busca inválida" });
        }

        const conn = await db.connect();

        if (!professional) {
            const [employeeTimeReserved] = await conn.query(
                `SELECT f.id, f.nome, a.dataInicio, a.dataFim FROM funcionarios f join agendamentos a on f.id = a.idFuncionario where a.data=?`,
                [date]
            );

            employeeTimeReserved.forEach((timeReserved) => {
                if (
                    timeReserved?.dataInicio &&
                    timeReserved?.dataFim &&
                    !alreadyHasProfessional(timeReserved, timesReserved)
                ) {
                    timesReserved.push({
                        id: timeReserved.id,
                        professionalReservedTimes: [],
                    });
                }
            });

            const getFilteredService = (professional) => {
                let filteredTime = employeeTimeReserved.filter((time) => {
                    return time.id === professional.id;
                });
                return filteredTime;
            };

            timesReserved.forEach((professional) => {
                let services = getFilteredService(professional);
                services.forEach((service) => {
                    professional.professionalReservedTimes.push({
                        begin: service.dataInicio,
                        end: service.dataFim,
                    });
                });
            });
        } else {
            const [employee] = await conn.query(
                `SELECT f.nome FROM funcionarios f join funcionarios_servicos fs on f.id=fs.idFuncionario join servicos s on s.id = fs.idServico where f.id = ? and s.id = ?`,
                [professional, service]
            );
            if (!employee?.length) {
                return res.json({ error: "Profissional inválido" });
            }
            const [employeeTimeReserved] = await conn.query(
                `SELECT * FROM agendamentos where data = ? and idFuncionario = ?`,
                [date, professional]
            );

            if (
                employeeTimeReserved[0]?.dataInicio &&
                employeeTimeReserved[0]?.dataFim
            ) {
                timesReserved.push({
                    id: employeeTimeReserved[0].idFuncionario,
                    professionalReservedTimes: [],
                });
            }

            employeeTimeReserved.forEach((time) => {
                timesReserved[0].professionalReservedTimes.push({
                    begin: time.dataInicio,
                    end: time.dataFim,
                });
            });
        }

        date = new Date(date + "UTC-3").setHours(10);
        let response = await mountAvailableTimes(
            service,
            timesReserved,
            new Date(date)
        );
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });

        res.json(response);
    } catch (e) {
        console.error(e);
    }
});

router.get("/reservas", async (req, res, next) => {
    try {
        let isAuthorized = await checkPermission(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ erro: "Usuário deslogado" });
        }
        const conn = await db.connect();
        const [userData] = await conn.query(
            `SELECT data FROM sessions where session_id = ?`,
            [req.headers.authorization]
        );
        let user = JSON.parse(userData[0].data);
        user = user.passport.user;
        const [userReserves] = await conn.query(
            `SELECT a.id, s.nome as 'servico', f.nome as 'profissional', a.dataInicio, a.dataFim, a.valor as 'preco', s.pagavel, a.pago FROM funcionarios f join agendamentos a on f.id = a.idFuncionario join servicos s on s.id = a.idServico where a.cliente = ?;`,
            [user]
        );
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });
        res.json(userReserves);
    } catch (e) {}
});

router.delete("/reserva", async (req, res, next) => {
    try {
        let isAuthorized = await checkPermission(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ erro: "Usuário deslogado" });
        }
        const conn = await db.connect();
        const [userData] = await conn.query(
            `SELECT data FROM sessions where session_id = ?`,
            [req.headers.authorization]
        );
        let user = JSON.parse(userData[0].data);
        user = user.passport.user;

        const reserve = req.body.id;

        const [reserveItem] = await conn.query(
            `SELECT pago, dataFim FROM agendamentos where id = ?;`,
            [reserve]
        );
        if (
            Boolean(reserveItem[0].pago) ||
            new Date(reserveItem[0].dataFim) < new Date()
        ) {
            res.json({
                error: "A reserva já foi paga ou já foi realizada",
            });
        } else {
            const [removedCobReserve] = await conn.query(
                `DELETE from cobrancas where idAgendamento = ?;`,
                reserve
            );

            const [removedUserReserve] = await conn.query(
                `DELETE from agendamentos where id = ?;`,
                reserve
            );

            const [userReserves] = await conn.query(
                `SELECT a.id, s.nome as 'servico', f.nome as 'profissional', a.dataInicio, a.dataFim, a.valor as 'preco', s.pagavel, a.pago FROM funcionarios f join agendamentos a on f.id = a.idFuncionario join servicos s on s.id = a.idServico where a.cliente = ?;`,
                [user]
            );

            conn.end(function (err) {
                if (err) throw err;
                else console.log("Closing connection.");
            });

            res.json(userReserves);
        }
    } catch (e) {}
});

router.post("/google-user", async (req, res, next) => {
    try {
        let id = req.body.id;
        let email = req.body.email;
        let nome = req.body.nome;
        let tokenGoogle = req.body.tokenGoogle.substr(0, 125);
        const conn = await db.connect();

        const [user] = await conn.query(
            `SELECT id FROM usuarios where idGoogle = ?;`,
            [id]
        );
        if (!user?.length) {
            await conn.query(
                `INSERT INTO usuarios (idGoogle, emailGoogle, nome, tokenGoogle, isAdmin) values (?, ?, ?, ?, 0);`,
                [id, email, nome, tokenGoogle]
            );
        }
        await conn.query(
            `INSERT INTO sessions (session_id, expires, data) values (?, ?, ?);`,
            [
                tokenGoogle,
                1666320206,
                JSON.stringify({
                    cookie: {
                        originalMaxAge: null,
                        expires: null,
                        httpOnly: true,
                        path: "/",
                    },
                    passport: { user: user[0]?.id ? user[0].id : id },
                }),
            ]
        );

        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });

        res.json({
            message: "Success",
            session: tokenGoogle,
            userData: { name: req.body.nome },
        });
    } catch (e) {
        console.error(e);
    }
});

router.get("/infos", async (req, res, next) => {
    try {
        let isAuthorized = await checkPermission(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ erro: "Usuário deslogado" });
        }
        let professional = req.query.professional;
        let service = req.query.service;
        let date = req.query.date;

        const conn = await db.connect();
        const [infos] = await conn.query(
            `SELECT f.nome as 'professional', coalesce(s.duracaoMaxima, s.duracaoMinima) as 'duration', s.nome as 'service' from servicos s, funcionarios f where f.id = ? and s.id= ?;`,
            [professional, service]
        );

        let timeEnd = moment(date)
            .add(infos[0].duration.split(":")[0], "hours")
            .add(infos[0].duration.split(":")[1], "minutes");

        timeEnd = new Date(timeEnd);

        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });

        res.json({
            professional: infos[0].professional,
            timeEnd: `${timeEnd.getHours().toLocaleString("en-US", {
                minimumIntegerDigits: 2,
            })}:${timeEnd.getMinutes().toLocaleString("en-US", {
                minimumIntegerDigits: 2,
            })}`,
            service: infos[0].service,
        });
    } catch (e) {}
});

router.post("/horario", async (req, res, next) => {
    try {
        let isAuthorized = await checkPermission(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ erro: "Usuário deslogado" });
        }
        let professional = parseInt(req.body.professional);
        let service = req.body.service;
        let date = req.body.date;
        let chosenTime = req.body.time;

        let timesReserved = [];

        const isValidDate = () => {
            return (
                new Date(date + "UTC-3") >= new Date().setHours(0, 0, 0, 0) &&
                new Date(date + "UTC-3").getDay() !== 0 &&
                new Date(date + "UTC-3").getDay() !== 1
            );
        };

        let isValid = service && isValidDate();

        if (!isValid) {
            return res.json({ error: "Busca inválida" });
        }

        const conn = await db.connect();
        const [serviceDuration] = await conn.query(
            `SELECT coalesce(duracaoMaxima, duracaoMinima) as 'duracao' from servicos where id = ?;`,
            [service]
        );

        const [employeeTimeReserved] = await conn.query(
            `SELECT * FROM agendamentos where data = ? and idFuncionario = ?`,
            [date, professional]
        );

        if (
            employeeTimeReserved[0]?.dataInicio &&
            employeeTimeReserved[0]?.dataFim
        ) {
            timesReserved.push({
                id: employeeTimeReserved[0].idFuncionario,
                professionalReservedTimes: [],
            });
        }

        employeeTimeReserved.forEach((time) => {
            timesReserved[0].professionalReservedTimes.push({
                begin: time.dataInicio,
                end: time.dataFim,
            });
        });

        date = new Date(date + "UTC-3").setHours(10);
        let response = await mountAvailableTimes(
            service,
            timesReserved,
            new Date(date)
        );

        if (response.error) {
            res.json({ error: "No time available" });
        }

        if (response[0]?.availableTimes?.indexOf(chosenTime) > -1) {
            let formattedDate = `${new Date(date).getFullYear()}-${(
                new Date(date).getMonth() + 1
            ).toLocaleString("en-US", {
                minimumIntegerDigits: 2,
            })}-${new Date(date).getDate().toLocaleString("en-US", {
                minimumIntegerDigits: 2,
            })}`;

            let formattedDateBegin = `${formattedDate} ${chosenTime}:00`;

            const [userData] = await conn.query(
                `SELECT data FROM sessions where session_id = ?`,
                [req.headers.authorization]
            );

            let user = JSON.parse(userData[0].data);

            const [infos] = await conn.query(
                `SELECT f.nome as 'professional', coalesce(s.duracaoMaxima, s.duracaoMinima) as 'duration', s.nome as 'service', coalesce(s.precoMinimo, s.precoMaximo) as 'valor' from servicos s, funcionarios f where f.id = ? and s.id= ?;`,
                [professional, service]
            );

            let dateInit = req.body.date + " " + chosenTime;
            let timeEnd = moment(dateInit)
                .add(infos[0].duration.split(":")[0], "hours")
                .add(infos[0].duration.split(":")[1], "minutes");

            timeEnd = new Date(timeEnd);
            let formattedTimeEnd = `${req.body.date} ${timeEnd.getHours()}:${
                timeEnd.getMinutes() > 0
                    ? timeEnd.getMinutes()
                    : timeEnd.getMinutes() + "0"
            }`;

            await conn.query(
                `INSERT INTO agendamentos (dataInicio, idFuncionario, idServico, dataFim, data, cliente, valor, pago) values (?, ?, ?, ?, ?, ?, ?, 0);`,
                [
                    formattedDateBegin,
                    professional,
                    service,
                    formattedTimeEnd,
                    formattedDate,
                    user.passport.user,
                    infos[0].valor,
                ]
            );
            conn.end(function (err) {
                if (err) throw err;
                else console.log("Closing connection.");
            });
            res.json({ status: "success" });
        } else {
            conn.end(function (err) {
                if (err) throw err;
                else console.log("Closing connection.");
            });
            res.json({ nextAvailable: response[0].availableTimes[0] });
        }
    } catch (e) {
        console.error(e);
    }
});

router.get("/servicos", async (req, res, next) => {
    try {
        let isAuthorized = await checkPermission(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ erro: "Usuário deslogado" });
        }
        connection.query(
            "SELECT fs.idFuncionario, fs.idServico, s.nome as `servico`, s.precoMinimo, s.precoMaximo, s.duracaoMinima, s.duracaoMaxima, f.nome as `funcionario`, s.instrucoes, s.complemento FROM funcionarios_servicos fs join servicos s on s.id = fs.idServico join funcionarios f on f.id = fs.idFuncionario where f.ativo = true order by s.nome",
            async function (err, rows, fields) {
                if (err)
                    res.json({
                        error: "Não foi possível realizar esta operação",
                    });
                else {
                    const conn = await db.connect();
                    const [options] = await conn.query(
                        "SELECT s.id, s.nome as `servico`, co.nome FROM servicos s join service_customer_options sco on sco.idServico=s.id join customer_options co on sco.idOpcao=co.id order by s.nome"
                    );
                    rows.forEach((service) => {
                        service.options = [];
                        options.forEach((option) => {
                            if (service.idServico === option.id) {
                                return service.options.push(option.nome);
                            }
                        });
                    });
                    conn.end(function (err) {
                        if (err) throw err;
                        else console.log("Closing connection.");
                    });
                    res.json(rows);
                }
            }
        ).end;
    } catch (e) {
        console.error(e);
    }
});

router.get("/permission", async (req, res, next) => {
    try {
        let isAuthorized = await checkPermission(req.headers.authorization);
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
    res.json({
        message: "Success",
        session: res.req.sessionID,
        userData: { name: res.req.user.nome, id: res.req.user.id },
    });
});

router.post("/logout", async function (req, res, next) {
    let session = req.body.token;
    req.logout(function (err) {
        return;
    });
    const conn = await db.connect();
    const [serviceDuration] = await conn.query(
        `DELETE from sessions where session_id = ?;`,
        [session]
    );
    conn.end(function (err) {
        if (err) throw err;
        else console.log("Closing connection.");
    });
    res.json({});
});

router.post("/register", function (req, res, next) {
    try {
        let email = req.body.email.toString();
        let cell = req.body.cell.toString();
        let name = req.body.name.toString();
        bcrypt.hash(req.body.pass.toString(), 10, function (err, hash) {
            connection.query(
                "Insert into usuarios(email, senha, celular, nome, isAdmin) values (?, ?, ?, ?, 0);",
                [email, hash, cell, name],
                function (err, rows, fields) {
                    if (err) {
                        if (err.errno === 1062)
                            res.json({
                                error: "Já existe uma conta cadastrada com este e-mail",
                            });
                        else
                            res.json({
                                error: "Não foi possível realizar esta operação",
                            });
                    } else res.json(rows);
                }
            ).end;
        });
    } catch (e) {
        console.error(e);
    }
});

const reqGNAlready = GNRequest({
    clientId: process.env.GN_CLIENT_ID,
    clientSecret: process.env.GN_CLIENT_SECRET,
});

router.get("/qrcode", async (req, res, next) => {
    try {
        const isAuthorized = await checkPermission(req.headers.authorization);
        if (!isAuthorized) {
            res.status(403);
            return res.json({ erro: "Usuário deslogado" });
        }
        const conn = await db.connect();
        const userToken = req.headers.authorization;
        const order = req.query.order;

        const [userData] = await conn.query(
            `SELECT data FROM sessions where session_id = ?`,
            [userToken]
        );

        let user = JSON.parse(userData[0].data);
        user = user.passport.user;

        const [reservationInfos] = await conn.query(
            `SELECT cliente, valor FROM agendamentos where id = ?`,
            [order]
        );

        if (user !== reservationInfos[0].cliente) {
            return res.json({ error: "Acesso negado" });
        }

        const reqGN = await GNRequest({
            clientId: process.env.GN_CLIENT_ID,
            clientSecret: process.env.GN_CLIENT_SECRET,
        });

        const dataCob = {
            calendario: {
                expiracao: 3600,
            },
            valor: {
                original: reservationInfos[0].valor.toString(),
            },
            chave: "cf8ed2bb-fb36-47e1-9680-13329ccac4a3",
        };

        const cobResponse = await reqGN.post("/v2/cob", dataCob);

        const [cob] = await conn.query(
            `INSERT INTO cobrancas (idAgendamento, txid) values (?, ?)`,
            [order, cobResponse.data.txid]
        );

        const qrCodeResponse = await reqGN.get(
            `/v2/loc/${cobResponse.data.loc.id}/qrcode`
        );
        conn.end(function (err) {
            if (err) throw err;
            else console.log("Closing connection.");
        });
        res.json(qrCodeResponse.data);
    } catch (e) {
        console.error(e);
    }
});

router.get("/cobrancas", async (req, res, next) => {
    const reqGN = await GNRequest({
        clientId: process.env.GN_CLIENT_ID,
        clientSecret: process.env.GN_CLIENT_SECRET,
    });

    const cobResponse = await reqGN.get(
        "/v2/cob?inicio=2022-10-31T00:00:00Z&fim=2022-11-01T23:59:00Z"
    );

    res.json(cobResponse.data);
});

router.post("/webhook(/pix)?", async (req, res, next) => {
    const conn = await db.connect();

    const txid = req.body.pix[0].txid;

    const [order] = await conn.query(
        `SELECT idAgendamento from cobrancas where txid = ?`,
        [txid]
    );

    const [cob] = await conn.query(
        `UPDATE agendamentos set pago = 1 where id = ?`,
        [order[0].idAgendamento]
    );

    conn.end(function (err) {
        if (err) throw err;
        else console.log("Closing connection.");
    });

    res.send("200");
});

module.exports = router;
