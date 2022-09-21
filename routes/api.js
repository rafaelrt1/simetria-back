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
    console.log(moment(date));
    // console.log(
    //     timesAvailable,
    //     moment(
    //         date.setHours(
    //             timesAvailable[0].split(":")[0],
    //             timesAvailable[0].split(":")[1]
    //         )
    //     )
    // );
    timesAvailable.map((availableTime) => {
        timeReserved.map((unavailableTime) => {
            let teste = moment(new Date(date));
            // teste.setHours(
            //     availableTime.split(":")[0],
            //     availableTime.split(":")[1]
            // );
            // console.log(teste);
            // console.log(
            //     "availableTime: ",

            //     moment(new Date(date))
            // );
            // console.log(
            //     "unavailableTime.dataInicio: ",
            //     moment(unavailableTime.dataInicio)
            // );
            // console.log(
            //     "unavailableTime.dataFim: ",
            //     moment(unavailableTime.dataFim)
            // );
            if (
                moment(
                    new Date(date).setHours(availableTime.split(":")[0])
                ).isBetween(
                    moment(unavailableTime.dataInicio),
                    moment(unavailableTime.dataFim)
                ) ||
                moment(
                    new Date(date).setHours(availableTime.split(":")[0])
                ).isSame(moment(unavailableTime.dataInicio))
            ) {
                console.log("Indisponível");
            }
        });
    });
    // console.log(timeReserved);
    return timesAvailable;
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
        // if (weekDay !== 6) {
        //     return employee.availableTimes.push();
        // } else {
        console.log(new Date(date + "UTC-3"));
        employee.availableTimes = getTimeOptions(
            new Date(date + "UTC-3"),
            serviceDuration[0].tempo,
            timeReserved
        );
        // }
    });
    return response;
};

// const mountFullAvailableTimes = async (servico, weekDay) => {
//     const conn = await db.connect();
//     const [serviceDuration] = await conn.query(
//         `SELECT coalesce(duracaoMaxima, duracaoMinima) as 'tempo' FROM servicos where id = ?`,
//         [servico]
//     );
//     const [employeesAvailable] = await conn.query(
//         `SELECT f.id, f.nome as 'name' FROM servicos s join funcionarios_servicos fs on fs.idServico = s.id join funcionarios f on f.id = fs.idFuncionario where s.id = ?`,
//         [servico]
//     );

//     let response = [];
//     employeesAvailable.forEach((employee) => {
//         response.push({
//             employee: employee.id,
//             employeeName: employee.name,
//             availableTimes: [],
//         });
//     });
//     response.forEach((employee) => {
//         // if (weekDay !== 6) {
//         //     return employee.availableTimes.push();
//         // } else {
//         return employee.availableTimes.push(
//             getTimeOptions(weekDay, serviceDuration[0].tempo)
//         );
//         // }
//     });
//     return response;
// };

router.get("/horarios", async (req, res, next) => {
    try {
        let professional = req.query.profissional;
        let service = req.query.servico;
        let date = req.query.data;
        // let formattedDate = new Date(data+'UTC-3');
        let timeReserved = [];

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
            const [employeeTimeReserved] = await conn.query(
                `SELECT f.id, f.nome, a.dataInicio, a.dataFim FROM funcionarios f join funcionarios_servicos fs on f.id = fs.idFuncionario join agendamentos a on a.idServico = fs.idServico and f.id = a.idFuncionario where fs.idServico=? and a.data=?`,
                [service, date]
            );
            if (employeeTimeReserved[0]?.id) {
                employeeTimeReserved[0].dataInicio = new Date(
                    `${
                        employeeTimeReserved[0].dataInicio
                            .toString()
                            .split(".")[0]
                    }.-300Z`
                );
                employeeTimeReserved[0].dataFim = new Date(
                    `${
                        employeeTimeReserved[0].dataFim.toString().split(".")[0]
                    }.-300Z`
                );
                timeReserved.push(employeeTimeReserved[0]);
            }

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
                employeeTimeReserved[0].dataInicio = new Date(
                    `${
                        employeeTimeReserved[0].dataInicio
                            .toString()
                            .split(".")[0]
                    }.-300Z}`
                );
                employeeTimeReserved[0].dataFim = new Date(
                    `${
                        employeeTimeReserved[0].dataFim.toString().split(".")[0]
                    }.-300Z}`
                );
                timeReserved.push(employeeTimeReserved[0]);
            }
        }

        let response = await mountAvailableTimes(
            service,
            timeReserved,
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
