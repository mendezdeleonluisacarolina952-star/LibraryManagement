
const User = require('../models/user');
const passport = require('passport');

const isValidEmail = (email) =>
    typeof email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const publicUser = (user) => ({
    id: user._id,
    email: user.email
});

const registerUser = async (req, res) => {
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({
            success: false,
            message: 'Datos no validos'
        });
    }

    const { email, password } = body;

    if (
        !isValidEmail(email) ||
        typeof password !== 'string' ||
        password.length === 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Correo o contrasena no validos'
        });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail

        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'El usuario ya existe'
            });
        }

        const newUser = new User({
            email: normalizedEmail,
            isAdmin: false
        });
        newUser.setPassword(password);

        const savedUser = await newUser.save();

        return res.status(201).json({
            success: true,
            user: publicUser(savedUser)
        });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'El usuario ya existe'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'No se pudo registrar el usuario'
        });
    }
};

const loginUser = (req, res, next) => {
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({
            success: false,
            message: 'Credenciales no validas'
        });
    }

    const { email, password } = body;

    if (
        !isValidEmail(email) ||
        typeof password !== 'string' ||
        password.length === 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Credenciales no validas'
        });
    }

    req.body.email = email.trim().toLowerCase();

    return passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: (info && info.message) || 'Credenciales no validas'
            });
        }

        if (typeof req.logIn !== 'function') {
            return next(new Error('La sesion de usuario no esta disponible'));
        }

        return req.logIn(user, (loginErr) => {
            if (loginErr) {
                return next(loginErr);
            }

            return res.status(200).json({
                success: true,
                user: publicUser(user)
            });
        });
    })(req, res, next);

};

const logoutUser = (req, res, next) => {
    if (typeof req.logout !== 'function') {
        return next(new Error('La funcion de cierre de sesion no esta disponible'));
    }

    return req.logout((err) => {
        if (err) {
            return next(err);
        }

        if (req.session && typeof req.session.destroy === 'function') {
            return req.session.destroy((sessionErr) => {
                if (sessionErr) {
                    return next(sessionErr);
                }

                if (typeof res.clearCookie === 'function') {
                    res.clearCookie('connect.sid');
                }

                return res.status(200).json({
                    success: true,
                    message: 'Sesion cerrada'
                });
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Sesion cerrada'
        });
    });
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser
};
