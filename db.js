async function connect() {
    if (global.connection && global.connection.state !== 'disconnected')
        return global.connection;

    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection({
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASSWORD,
        database: process.env.DB,
        port: 3306
    });
    console.log("Conectou no MySQL!");
    global.connection = connection;
    return connection;
}

async function findUser(username) {
    const conn = await connect();
    const [rows] = await conn.query(`SELECT * FROM usuarios WHERE email=? LIMIT 1`, [username]);
    if (rows.length > 0)
        return rows[0];
    else return null;
}

async function findUserById(id) {
    const conn = await connect();
    const [rows] = await conn.query(`SELECT * FROM usuarios WHERE id=? LIMIT 1`, [id]);
        if (rows.length > 0)
            return rows[0];
        else return null;
}

module.exports = { connect, findUser, findUserById }