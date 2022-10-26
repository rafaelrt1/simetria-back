const bcrypt = require("bcrypt");
const LocalStrategy = require("passport-local").Strategy;

module.exports = function (passport) {
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const db = require("./db");
            const user = db.findUserById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    passport.use(
        new LocalStrategy(
            {
                usernameField: "username",
                passwordField: "password",
            },
            async (username, password, done) => {
                try {
                    const db = require("./db");
                    const user = await db.findUser(username);

                    if (!user) {
                        return done(null, false);
                    }
                    const isValid = bcrypt.compareSync(password, user.senha);

                    if (!isValid) {
                        return done(null, false);
                    }
                    return done(null, user);
                } catch (err) {
                    console.error("Erro");
                    done(err, false);
                }
            }
        )
    );
};
