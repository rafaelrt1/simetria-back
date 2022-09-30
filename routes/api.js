const express = require("express");
const router = express.Router();
const connection = require("../config/connectDb");
const passport = require("passport");
const bcrypt = require("bcrypt");
require("dotenv").config();
const db = require("../db");
const moment = require("moment");

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

            const dateBegining = date.setHours(
                startTimeHours,
                startTimeMinutes
            );
            const dateEnd = moment(dateBegining)
                .add(hoursDuration, "hours")
                .add(minutesDuration, "minutes");

            if (dateClosingToday.isSameOrAfter(dateEnd)) {
                return timesAvailable.push(day.time);
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

            const dateBegining = date.setHours(
                startTimeHours,
                startTimeMinutes
            );
            const dateEnd = moment(dateBegining)
                .add(hoursDuration, "hours")
                .add(minutesDuration, "minutes");

            if (dateClosingToday.isSameOrAfter(dateEnd)) {
                return timesAvailable.push(day.time);
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

            const dateBegining = date.setHours(
                startTimeHours,
                startTimeMinutes
            );
            const dateEnd = moment(dateBegining)
                .add(hoursDuration, "hours")
                .add(minutesDuration, "minutes");

            if (dateClosingToday.isSameOrAfter(dateEnd)) {
                return timesAvailable.push(day.time);
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

    if (!timeReserved.length) {
        response = timesAvailable;
    }
    timesAvailable.forEach((availableTime, index) => {
        timeReserved.forEach((unavailableTime) => {
            let beginTimeReserved = moment(unavailableTime.begin);
            let endTimeReserved = moment(unavailableTime.end);
            let timeBegin = moment(
                new Date(date).setHours(
                    availableTime.split(":")[0],
                    availableTime.split(":")[1]
                )
            );

            let timeEnd = moment(timeBegin)
                .add(hoursDuration, "hours")
                .add(minutesDuration, "minutes");

            for (let i = 0; timeEnd !== timeBegin; ) {
                timeEnd = timeEnd.add(30, "minutes");
                console.log(timeBegin === timeEnd);
            }

            if (
                !timeAlreadyReserved(timeBegin, timeEnd, timeReserved) &&
                !pushedValue(response, availableTime)
            ) {
                response.push(availableTime);
            }
        });
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
        // }
    });
    return response;
};

router.get("/horarios", async (req, res, next) => {
    try {
        let professional = req.query.profissional;
        let service = req.query.servico;
        let date = req.query.data;
        // let formattedDate = new Date(data+'UTC-3');
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

        // formattedDate = formattedDate.getFullYear() +'-' + (formattedDate.getMonth()+1) +'-' + formattedDate.getDate();

        const conn = await db.connect();

        if (!professional) {
            // const [employeeTimeReserved] = await conn.query(
            //     `SELECT f.id, f.nome, a.dataInicio, a.dataFim FROM funcionarios f join funcionarios_servicos fs on f.id = fs.idFuncionario join agendamentos a on a.idServico = fs.idServico and f.id = a.idFuncionario where fs.idServico=? and a.data=?`,
            //     [service, date]
            // );
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
                // timesReserved.forEach((professional) => {
                //     if (professional.id === timeReserved.id) {
                //         professional.professionalReservedTimes.push({
                //             begin: timeReserved.dataInicio,
                //             end: timeReserved.dataFim,
                //         });
                //     }
                // });
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

            // let select = `SELECT * FROM agendamentos where data = ?`;
            // let indexEmployee;
            // employeesAvailable.forEach(async(employee, index) => {
            //     if (index === 0)
            //         select = select + ' and idFuncionario = ?';
            //     else {
            //         select = select + ' or idFuncionario = ?';
            //     }
            //     const [employeeTimeReserved] = await conn.query(select, [data, employee.id]);
            //     // indexEmployee = employee;
            //     // timeReserved.push(employeeTimeReserved);
            // })
            // const [reservedTimes] = await conn.query(select, [data, employee])
        } else {
            const [employeeTimeReserved] = await conn.query(
                `SELECT * FROM agendamentos where data = ? and idFuncionario = ?`,
                [date, professional]
            );
            if (employeeTimeReserved[0]?.id) {
                timesReserved.push(employeeTimeReserved[0]);
            }
        }

        date = new Date(date + "UTC-3").setHours(10);
        let response = await mountAvailableTimes(
            service,
            timesReserved,
            new Date(date)
        );

        res.json(response);
    } catch (e) {
        console.error(e);
    }
});

router.get("/servicos", async (req, res, next) => {
    try {
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
                    res.json(rows);
                }
            }
        ).end;
    } catch (e) {
        console.error(e);
    }
});

router.post(
    "/login",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureMessage: "Error",
    }),
    function (req, res) {
        res.json({ message: "Success", session: res.req.sessionID });
    }
);

router.post("/register", function (req, res, next) {
    try {
        let email = req.body.email.toString();
        let cell = req.body.cell.toString();
        let name = req.body.name.toString();
        bcrypt.hash(req.body.pass.toString(), 10, function (err, hash) {
            connection.query(
                "Insert into usuarios(email, senha, celular, nome) values (?, ?, ?, ?);",
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

module.exports = router;
