
jest.mock("../models/user", () => jest.fn());

jest.mock("passport", () => ({
    authenticate: jest.fn()
}));

const User = require("../models/user");
const passport = require("passport");

const {
    registerUser,
    loginUser,
    logoutUser
} = require("../controllers/authController");

const createResponse = () => {
    const res = {
        status: jest.fn(),
        json: jest.fn(),
        clearCookie: jest.fn()
    };

    res.status.mockReturnValue(res);
    return res;
};

const createUser = (overrides = {}) => ({
    _id: "user-123",
    email: "test@example.com",
    setPassword: jest.fn(),
    save: jest.fn(),
    ...overrides
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe("Pruebas unitarias del controlador de autenticacion", () => {

    test("TA-01: inicia sesion con credenciales correctas", () => {
        const user = createUser();
        passport.authenticate.mockImplementation(
            (strategy, callback) => (req, res, next) => {
                callback(null, user, null);
            }
        );

        const req = {
            body: {
                email: "test@example.com",
                password: "CorrectPassword123"
            },
            logIn: jest.fn((authenticatedUser, callback) => callback(null))
        };

        const res = createResponse();
        const next = jest.fn();

        loginUser(req, res, next);

        expect(passport.authenticate).toHaveBeenCalledWith(
            "local",
            expect.any(Function)
        );
        expect(req.logIn).toHaveBeenCalledWith(user, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            user: {
                id: user._id,
                email: user.email
            }
        });
        expect(next).not.toHaveBeenCalled();
    });

    test("TA-02: rechaza credenciales incorrectas", () => {
        passport.authenticate.mockImplementation(
            (strategy, callback) => (req, res, next) => {
                callback(null, false, { message: "Password incorrect" });
            }
        );
        const req = {
            body: {
                email: "test@example.com",
                password: "WrongPassword123"
            }
        };

        const res = createResponse();
        const next = jest.fn();

        loginUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Password incorrect"
        });
        expect(req.logIn).toBeUndefined();
    });

    test("TA-03: rechaza el acceso si el usuario no existe", () => {
        passport.authenticate.mockImplementation(
            (strategy, callback) => (req, res, next) => {
                callback(null, false, { message: "Credenciales no validas" });
            }
        );

        const req = {
            body: {
                email: "unknown@example.com",
                password: "Password123"
            }
        };

        const res = createResponse();
        const next = jest.fn();

        loginUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Credenciales no validas"
        });
    });

    test("TA-04: impide registrar un usuario existente", async () => {
        User.mockImplementation(() => createUser());

        User.findOne = jest.fn().mockResolvedValue({
            _id: "existing-user",
            email: "test@example.com"
        });

        const req = {
            body: {
                email: "test@example.com",
                password: "Password123"
            }
        };

        const res = createResponse();

        await registerUser(req, res);

        expect(User.findOne).toHaveBeenCalledWith({
            email: "test@example.com"
        });
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "El usuario ya existe"
        });
    });

    test("TA-05: registra un usuario nuevo", async () => {
        const savedUser = createUser({
            _id: "new-user",
            email: "new@example.com"
        });

        const setPassword = jest.fn();
        const save = jest.fn().mockResolvedValue(savedUser);

        User.findOne = jest.fn().mockResolvedValue(null);

        User.mockImplementation(() => ({
            _id: savedUser._id,
            email: savedUser.email,
            setPassword,
            save
        }));

        const req = {
            body: {
                email: "new@example.com",
                password: "Password123"
            }
        };

        const res = createResponse();

        await registerUser(req, res);

        expect(setPassword).toHaveBeenCalledWith("Password123");
        expect(save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            user: {
                id: savedUser._id,
                email: savedUser.email
            }
        });
    });

    test("TA-06: cierra la sesion correctamente", () => {
        const req = {
            logout: jest.fn(callback => callback(null))
        };

        const res = createResponse();
        const next = jest.fn();

        logoutUser(req, res, next);

        expect(req.logout).toHaveBeenCalledWith(expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Sesion cerrada"
        });
        expect(next).not.toHaveBeenCalled();
    });

    test("TA-07: propaga el error al cerrar la sesion", () => {
        const error = new Error("Logout failed");

        const req = {
            logout: jest.fn(callback => callback(error))
        };

        const res = createResponse();
        const next = jest.fn();

        logoutUser(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
    });

    test("TA-08: propaga un error de autenticacion", () => {
        const error = new Error("Authentication failed");

        passport.authenticate.mockImplementation(
            (strategy, callback) => (req, res, next) => {
                callback(error, null, null);
            }
        );

        const req = {
            body: {
                email: "test@example.com",
                password: "Password123"
            }
        };

        const res = createResponse();
        const next = jest.fn();

        loginUser(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
    });

    test("TA-09: rechaza un correo invalido", () => {
        const req = {
            body: {
                email: "correo-invalido",
                password: "Password123"
            }
        };

        const res = createResponse();
        const next = jest.fn();

        loginUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(passport.authenticate).not.toHaveBeenCalled();
    });

    test("TA-10: no permite establecer privilegios durante el registro", async () => {
        const savedUser = createUser({
            _id: "new-user",
            email: "new@example.com"
        });

        User.findOne = jest.fn().mockResolvedValue(null);

        let userData;

        User.mockImplementation(data => {
            userData = data;

            return {
                _id: savedUser._id,
                email: data.email,
                setPassword: jest.fn(),
                save: jest.fn().mockResolvedValue(savedUser)
            };
        });

        const req = {
            body: {
                email: "new@example.com",
                password: "Password123",
                isAdmin: true,
                role: "admin"
            }
        };

        const res = createResponse();

        await registerUser(req, res);

        expect(userData).toEqual({
            email: "new@example.com",
            isAdmin: false
        });
        expect(res.status).toHaveBeenCalledWith(201);
    });
});