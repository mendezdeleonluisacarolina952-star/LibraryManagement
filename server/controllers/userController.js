
const User = require('../models/user');

const isValidEmail = (email) =>
    typeof email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const isValidId = (id) =>
    typeof id === 'string' &&
    /^[a-fA-F0-9]{24}$/.test(id);

const publicUser = (user) => ({
    id: user._id,
    email: user.email
});

const isValidRequestBody = (body) =>
    body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body);

const validateUpdateUser = (body) => {
    if (!isValidRequestBody(body)) {
        return {
            status: 400,
            message: 'Datos no validos'
        };
    }

    const allowedKeys = new Set(['email', 'password']);
    const keys = Object.keys(body);

    if (keys.some((key) => !allowedKeys.has(key))) {
        return {
            status: 400,
            message: 'Solo se permite actualizar correo o contrasena'
        };
    }

    const { email, password } = body;

    if (email === undefined && password === undefined) {
        return {
            status: 400,
            message: 'No hay campos validos para actualizar'
        };
    }

    if (email !== undefined && !isValidEmail(email)) {
        return {
            status: 400,
            message: 'Correo no valido'
        };
    }

    if (
        password !== undefined &&
        (typeof password !== 'string' || password.length === 0)
    ) {
        return {
            status: 400,
            message: 'Contrasena no valida'
        };
    }

    return null;
};

const getUser = async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de usuario no valido'
        });
    }

    try {
        const user = await User.findById(req.params.id)
            .select('-hash -salt -password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            user: publicUser(user)
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'Error al consultar el usuario'
        });
    }
};

const getAllUsers = async (_req, res) => {
    try {
        const users = await User.find({})
            .select('-hash -salt -password');

        return res.status(200).json({
            success: true,
            usersList: users.map(publicUser)
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'Error al consultar los usuarios'
        });
    }
};

const getAllMembers = async (_req, res) => {
    try {
        const members = await User.find({ isAdmin: false })
            .select('-hash -salt -password');

        return res.status(200).json({
            success: true,
            membersList: members.map(publicUser)
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'Error al consultar los miembros'
        });
    }
};

const addUser = async (req, res) => {
    const body = req.body;

    if (!isValidRequestBody(body)) {
        return res.status(400).json({
            success: false,
            message: 'Datos de usuario no validos'
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

        const existing = await User.findOne({
            email: { $eq: normalizedEmail }
        }).lean();

        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'El usuario ya existe'
            });
        }

        const user = new User({
            email: normalizedEmail,
            isAdmin: false
        });

        user.setPassword(password);

        const saved = await user.save();

        return res.status(201).json({
            success: true,
            user: publicUser(saved)
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

const updateUser = async (req, res) => {
    const { id } = req.params;


    if (!isValidId(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de usuario no valido'
        });
    }
    const validationError = validateUpdateUser(req.body);

    if (validationError) {
        return res.status(validationError.status).json({
            success: false,
            message: validationError.message
        });
    }

    const { email, password } = req.body;

    try {
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (email !== undefined) {
            user.email = email.trim().toLowerCase();
        }

        if (password !== undefined) {
            user.setPassword(password);
        }

        await user.save();

        return res.status(200).json({
            success: true,
            updatedUser: publicUser(user)
        });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'El correo ya esta registrado'
            });
        }

        return res.status(400).json({
            success: false,
            message: 'No se pudo actualizar el usuario'
        });
    }
};

const deleteUser = async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de usuario no valido'
        });
    }

    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            deletedUser: publicUser(user)
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudo eliminar el usuario'
        });
    }
};

module.exports = {
    getUser,
    getAllUsers,
    getAllMembers,
    addUser,
    updateUser,
    deleteUser
};
