const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local').Strategy;

module.exports = function (passport) {

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const db = require('./db');
            const user = db.findUserById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    // passport.use(new GoogleStrategy({
    //     clientID:     GOOGLE_CLIENT_ID,
    //     clientSecret: GOOGLE_CLIENT_SECRET,
    //     callbackURL: "http://localhost:3001/auth/google/callback",
    //     passReqToCallback   : true
    // }, authUser)
    //     authUser = (request, accessToken, refreshToken, profile, done) => {
    //         return done(null, profile);
    //     }
    // ));

    passport.use(new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password'
    },
        async (username, password, done) => {
            try {
                const db = require('./db');
                const user = await db.findUser(username);
                // usuário inexistente
                if (!user) { console.log("usuário inexistente");return done(null, false) }

                const isValid = bcrypt.compareSync(password, user.senha);
                
                if (!isValid) {
                    console.log("Senha incorreta");
                    return done(null, false);
                }
                console.log("Conectado");
                return done(null, user);
            } catch (err) {
                console.error("Erro");
                done(err, false);
            }
        }
    ));
}