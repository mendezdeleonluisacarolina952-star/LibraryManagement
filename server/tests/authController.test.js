
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

const validBody = {
    email: "test@example.com",
    password: "Password123"
};

const createRequest = (body = validBody) => ({
    body: { ...body }
});

const configurePassport = (error, user, info) => {
    passport.authenticate.mockImplementation(
        (strategy, callback) => (req, res, next) => {
            callback(error, user, info);
        }
    );
};

beforeEach(() => {
    jest.clearAllMocks();
    User.findOne = jest.fn();
});

describe("Pruebas unitarias del controlador de autenticacion", () => {
    describe("registerUser", () => {
        test("registra un usuario nuevo", async () => {
            const savedUser = createUser({
                _id: "new-user",
                email: "new@example.com"
            });
            const setPassword = jest.fn();
            const save = jest.fn().mockResolvedValue(savedUser);

            User.findOne.mockResolvedValue(null);
            User.mockImplementation(() => ({
                _id: savedUser._id,
                email: "new@example.com",
                setPassword,
                save
            }));

            const req = createRequest({
                email: "new@example.com",
                password: "Password123"
            });
            const res = createResponse();

            await registerUser(req, res);

            expect(User.findOne).toHaveBeenCalledWith({
                email: "new@example.com"
            });
            expect(setPassword).toHaveBeenCalledWith("Password123");
            expect(save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                user: {
                    id: "new-user",
                    email: "new@example.com"
                }
            });
        });

        test("rechaza un cuerpo ausente", async () => {
            const res = createResponse();

            await registerUser({ body: null }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(User.findOne).not.toHaveBeenCalled();
        });

        test("rechaza un cuerpo que no es un objeto", async () => {
            const res = createResponse();

            await registerUser({ body: "invalid" }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("rechaza un cuerpo de tipo arreglo", async () => {
            const res = createResponse();

            await registerUser({ body: [] }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test.each([
            ["correo invalido", "correo-invalido", "Password123"],
            ["correo ausente", undefined, "Password123"],
            ["correo no textual", 123, "Password123"],
            ["contrasena ausente", "test@example.com", undefined],
            ["contrasena vacia", "test@example.com", ""],
            ["contrasena no textual", "test@example.com", 123]
        ])("rechaza datos invalidos: %s", async (caso, email, password) => {
            const res = createResponse();

            await registerUser({
                body: { email, password }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(User.findOne).not.toHaveBeenCalled();
        });

        test("normaliza el correo antes de buscar y registrar", async () => {
            const savedUser = createUser({
                email: "test@example.com"
            });

            User.findOne.mockResolvedValue(null);
            User.mockImplementation(data => ({
                _id: "user-123",
                email: data.email,
                setPassword: jest.fn(),
                save: jest.fn().mockResolvedValue(savedUser)
            }));

            const res = createResponse();

            await registerUser({
                body: {
                    email: "  TEST@Example.COM  ",
                    password: "Password123"
                }
            }, res);

            expect(User.findOne).toHaveBeenCalledWith({
                email: "test@example.com"
            });
            expect(User).toHaveBeenCalledWith({
                email: "test@example.com",
                isAdmin: false
            });
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test("impide registrar un usuario existente", async () => {
            User.findOne.mockResolvedValue({
                _id: "existing-user",
                email: "test@example.com"
            });

            const res = createResponse();

            await registerUser({ body: validBody }, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "El usuario ya existe"
            });
            expect(User).not.toHaveBeenCalled();
        });

        test("maneja un error de duplicado de MongoDB", async () => {
            User.findOne.mockRejectedValue({ code: 11000 });

            const res = createResponse();

            await registerUser({ body: validBody }, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "El usuario ya existe"
            });
        });

        test("maneja un error inesperado al consultar el usuario", async () => {
            User.findOne.mockRejectedValue(new Error("Database error"));

            const res = createResponse();

            await registerUser({ body: validBody }, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "No se pudo registrar el usuario"
            });
        });

        test("maneja un error al guardar el usuario", async () => {
            User.findOne.mockResolvedValue(null);
            User.mockImplementation(() => ({
                setPassword: jest.fn(),
                save: jest.fn().mockRejectedValue(new Error("Save failed"))
            }));

            const res = createResponse();

            await registerUser({ body: validBody }, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "No se pudo registrar el usuario"
            });
        });
    });

    describe("loginUser", () => {
        test("inicia sesion con credenciales correctas", () => {
            const user = createUser();
            configurePassport(null, user, null);

            const req = createRequest();
            req.logIn = jest.fn((authenticatedUser, callback) => callback(null));

            const res = createResponse();
            const next = jest.fn();

            loginUser(req, res, next);

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

        test("rechaza un cuerpo ausente", () => {
            const res = createResponse();

            loginUser({ body: null }, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(passport.authenticate).not.toHaveBeenCalled();
        });

        test("rechaza un cuerpo que no es un objeto", () => {
            const res = createResponse();

            loginUser({ body: "invalid" }, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("rechaza un cuerpo de tipo arreglo", () => {
            const res = createResponse();

            loginUser({ body: [] }, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test.each([
            ["correo invalido", "correo-invalido", "Password123"],
            ["correo ausente", undefined, "Password123"],
            ["correo no textual", 123, "Password123"],
            ["contrasena ausente", "test@example.com", undefined],
            ["contrasena vacia", "test@example.com", ""],
            ["contrasena no textual", "test@example.com", 123]
        ])("rechaza credenciales invalidas: %s", (caso, email, password) => {
            const res = createResponse();

            loginUser({
                body: { email, password }
            }, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(passport.authenticate).not.toHaveBeenCalled();
        });

        test("normaliza el correo al iniciar sesion", () => {
            const user = createUser();
            configurePassport(null, user, null);

            const req = createRequest({
                email: "  TEST@Example.COM ",
                password: "Password123"
            });
            req.logIn = jest.fn((authenticatedUser, callback) => callback(null));

            loginUser(req, createResponse(), jest.fn());

            expect(req.body.email).toBe("test@example.com");
        });

        test("rechaza credenciales incorrectas", () => {
            configurePassport(null, false, {
                message: "Password incorrect"
            });

            const res = createResponse();

            loginUser(createRequest(), res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Password incorrect"
            });
        });

        test("usa mensaje predeterminado si Passport no proporciona informacion", () => {
            configurePassport(null, false, null);

            const res = createResponse();

            loginUser(createRequest(), res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Credenciales no validas"
            });
        });

        test("propaga un error de autenticacion", () => {
            const error = new Error("Authentication failed");
            configurePassport(error, null, null);

            const next = jest.fn();

            loginUser(createRequest(), createResponse(), next);

            expect(next).toHaveBeenCalledWith(error);
        });

        test("maneja la ausencia de req.logIn", () => {
            const user = createUser();
            configurePassport(null, user, null);

            const next = jest.fn();

            loginUser(createRequest(), createResponse(), next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "La sesion de usuario no esta disponible"
                })
            );
        });

        test("propaga un error al crear la sesion", () => {
            const user = createUser();
            const error = new Error("Login failed");
            configurePassport(null, user, null);

            const req = createRequest();
            req.logIn = jest.fn((authenticatedUser, callback) => callback(error));

            const next = jest.fn();

            loginUser(req, createResponse(), next);

            expect(next).toHaveBeenCalledWith(error);
        });

        test("rechaza al usuario inexistente", () => {
            configurePassport(null, false, {
                message: "Credenciales no validas"
            });

            const res = createResponse();

            loginUser(createRequest({
                email: "unknown@example.com",
                password: "Password123"
            }), res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    describe("logoutUser", () => {
        test("cierra la sesion correctamente sin objeto de sesion", () => {
            const req = {
                logout: jest.fn(callback => callback(null))
            };

            const res = createResponse();
            const next = jest.fn();

            logoutUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Sesion cerrada"
            });
            expect(next).not.toHaveBeenCalled();
        });

        test("maneja la ausencia de req.logout", () => {
            const next = jest.fn();

            logoutUser({}, createResponse(), next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "La funcion de cierre de sesion no esta disponible"
                })
            );
        });

        test("propaga un error al cerrar la sesion", () => {
            const error = new Error("Logout failed");
            const req = {
                logout: jest.fn(callback => callback(error))
            };

            const next = jest.fn();

            logoutUser(req, createResponse(), next);

            expect(next).toHaveBeenCalledWith(error);
        });

        test("destruye la sesion y elimina la cookie", () => {
            const req = {
                logout: jest.fn(callback => callback(null)),
                session: {
                    destroy: jest.fn(callback => callback(null))
                }
            };

            const res = createResponse();

            logoutUser(req, res, jest.fn());

            expect(req.session.destroy).toHaveBeenCalled();
            expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test("propaga un error al destruir la sesion", () => {
            const error = new Error("Session destroy failed");
            const req = {
                logout: jest.fn(callback => callback(null)),
                session: {
                    destroy: jest.fn(callback => callback(error))
                }
            };

            const next = jest.fn();

            logoutUser(req, createResponse(), next);

            expect(next).toHaveBeenCalledWith(error);
        });

        test("no falla si res.clearCookie no existe", () => {
            const req = {
                logout: jest.fn(callback => callback(null)),
                session: {
                    destroy: jest.fn(callback => callback(null))
                }
            };

            const res = {
                status: jest.fn(),
                json: jest.fn()
            };
            res.status.mockReturnValue(res);

            logoutUser(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
