
jest.mock('../models/user', () => {
    const MockUser = jest.fn();

    MockUser.findById = jest.fn();
    MockUser.find = jest.fn();
    MockUser.findOne = jest.fn();
    MockUser.findByIdAndDelete = jest.fn();

    return MockUser;
});

const User = require('../models/user');

const {
    getUser,
    getAllUsers,
    getAllMembers,
    addUser,
    updateUser,
    deleteUser
} = require('../controllers/userController');

const createResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const validId = '507f1f77bcf86cd799439011';

const createUser = (overrides = {}) => ({
    _id: validId,
    email: 'user@example.com',
    isAdmin: false,
    setPassword: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides
});

const mockSelect = (result) => ({
    select: jest.fn().mockResolvedValue(result)
});

describe('userController', () => {
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        res = createResponse();
    });

    describe('getUser', () => {
        test('returns 400 for invalid ID', async () => {
            await getUser({ params: { id: 'invalid' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when user does not exist', async () => {
            User.findById.mockReturnValue(mockSelect(null));

            await getUser({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns public user data only', async () => {
            User.findById.mockReturnValue(
                mockSelect({
                    _id: validId,
                    email: 'user@example.com',
                    password: 'secret',
                    hash: 'hash',
                    salt: 'salt'
                })
            );

            await getUser({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                user: {
                    id: validId,
                    email: 'user@example.com'
                }
            });
        });

        test('returns 500 when lookup fails', async () => {
            User.findById.mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error('Database error'))
            });

            await getUser({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getAllUsers', () => {
        test('returns public data for all users', async () => {
            User.find.mockReturnValue(mockSelect([
                { _id: '1', email: 'one@example.com' },
                { _id: '2', email: 'two@example.com' }
            ]));

            await getAllUsers({}, res);

            expect(User.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                usersList: [
                    { id: '1', email: 'one@example.com' },
                    { id: '2', email: 'two@example.com' }
                ]
            });
        });

        test('returns 500 when lookup fails', async () => {
            User.find.mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error('Database error'))
            });

            await getAllUsers({}, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getAllMembers', () => {
        test('returns members who are not admins', async () => {
            User.find.mockReturnValue(mockSelect([
                { _id: '1', email: 'member@example.com' }
            ]));

            await getAllMembers({}, res);

            expect(User.find).toHaveBeenCalledWith({ isAdmin: false });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                membersList: [
                    { id: '1', email: 'member@example.com' }
                ]
            });
        });

        test('returns 500 when lookup fails', async () => {
            User.find.mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error('Database error'))
            });

            await getAllMembers({}, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('addUser', () => {
        test('returns 400 for missing body', async () => {
            await addUser({}, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 for array body', async () => {
            await addUser({ body: [] }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 for invalid email', async () => {
            await addUser({
                body: { email: 'invalid-email', password: 'secret' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 for empty password', async () => {
            await addUser({
                body: { email: 'user@example.com', password: '' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 409 when email already exists', async () => {
            User.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({ email: 'user@example.com' })
            });

            await addUser({
                body: { email: 'USER@example.com', password: 'secret' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(User).not.toHaveBeenCalled();
        });

        test('creates user with normalized email and password', async () => {
            const savedUser = {
                _id: validId,
                email: 'user@example.com'
            };

            User.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null)
            });

            User.mockImplementation(function (data) {
                this._id = validId;
                this.email = data.email;
                this.isAdmin = data.isAdmin;
                this.setPassword = jest.fn();
                this.save = jest.fn().mockResolvedValue(savedUser);
            });

            await addUser({
                body: {
                    email: ' User@Example.com ',
                    password: 'secret'
                }
            }, res);

            expect(User.findOne).toHaveBeenCalledWith({
                email: { $eq: 'user@example.com' }
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                user: {
                    id: validId,
                    email: 'user@example.com'
                }
            });
        });

        test('returns 409 for duplicate-key database error', async () => {
            User.findOne.mockReturnValue({
                lean: jest.fn().mockRejectedValue({ code: 11000 })
            });

            await addUser({
                body: { email: 'user@example.com', password: 'secret' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(409);
        });

        test('returns 500 for other database errors', async () => {
            User.findOne.mockReturnValue({
                lean: jest.fn().mockRejectedValue(new Error('Database error'))
            });

            await addUser({
                body: { email: 'user@example.com', password: 'secret' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('updateUser', () => {
        test('returns 400 for invalid ID', async () => {
            await updateUser({
                params: { id: 'invalid' },
                body: { email: 'new@example.com' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 for invalid body', async () => {
            await updateUser({
                params: { id: validId },
                body: null
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('rejects fields that are not allowed', async () => {
            await updateUser({
                params: { id: validId },
                body: { isAdmin: true }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('rejects empty update', async () => {
            await updateUser({
                params: { id: validId },
                body: {}
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('rejects invalid email', async () => {
            await updateUser({
                params: { id: validId },
                body: { email: 'bad-email' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('rejects empty password', async () => {
            await updateUser({
                params: { id: validId },
                body: { password: '' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when user does not exist', async () => {
            User.findById.mockResolvedValue(null);

            await updateUser({
                params: { id: validId },
                body: { email: 'new@example.com' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('updates and normalizes email', async () => {
            const user = createUser();
            User.findById.mockResolvedValue(user);

            await updateUser({
                params: { id: validId },
                body: { email: ' NEW@Example.com ' }
            }, res);

            expect(user.email).toBe('new@example.com');
            expect(user.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('updates password using setPassword', async () => {
            const user = createUser();
            User.findById.mockResolvedValue(user);

            await updateUser({
                params: { id: validId },
                body: { password: 'new-secret' }
            }, res);

            expect(user.setPassword).toHaveBeenCalledWith('new-secret');
            expect(user.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('returns 409 for duplicate email', async () => {
            const user = createUser({
                save: jest.fn().mockRejectedValue({ code: 11000 })
            });
            User.findById.mockResolvedValue(user);

            await updateUser({
                params: { id: validId },
                body: { email: 'taken@example.com' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(409);
        });

        test('returns 400 for other update errors', async () => {
            User.findById.mockRejectedValue(new Error('Database error'));

            await updateUser({
                params: { id: validId },
                body: { email: 'new@example.com' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('deleteUser', () => {
        test('returns 400 for invalid ID', async () => {
            await deleteUser({ params: { id: 'invalid' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when user does not exist', async () => {
            User.findByIdAndDelete.mockResolvedValue(null);

            await deleteUser({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('deletes user and returns public fields', async () => {
            User.findByIdAndDelete.mockResolvedValue({
                _id: validId,
                email: 'user@example.com',
                password: 'secret'
            });

            await deleteUser({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                deletedUser: {
                    id: validId,
                    email: 'user@example.com'
                }
            });
        });

        test('returns 500 when deletion fails', async () => {
            User.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

            await deleteUser({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
