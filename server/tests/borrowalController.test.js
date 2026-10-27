
jest.mock('../models/borrowal', () => ({
    findById: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

jest.mock('../models/book', () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));

jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');

    return {
        ...actual,
        startSession: jest.fn()
    };
});

const mongoose = require('mongoose');
const Borrowal = require('../models/borrowal');
const Book = require('../models/book');

const {
    getBorrowal,
    getAllBorrowals,
    addBorrowal,
    updateBorrowal,
    deleteBorrowal
} = require('../controllers/borrowalController');

const createResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const validId = '507f1f77bcf86cd799439011';
const bookId = '507f191e810c19729de860ea';

const createSession = () => {
    const session = {
        withTransaction: jest.fn(async (callback) => callback()),
        endSession: jest.fn().mockResolvedValue(undefined)
    };

    mongoose.startSession.mockResolvedValue(session);
    return session;
};

describe('borrowalController', () => {
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        res = createResponse();
    });

    describe('getBorrowal', () => {
        test('returns 400 for invalid ID', async () => {
            await getBorrowal({ params: { id: 'invalid' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when borrowal does not exist', async () => {
            Borrowal.findById.mockResolvedValue(null);

            await getBorrowal({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns borrowal successfully', async () => {
            const borrowal = { memberId: validId, bookId };
            Borrowal.findById.mockResolvedValue(borrowal);

            await getBorrowal({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                borrowal
            });
        });

        test('returns 500 when query fails', async () => {
            Borrowal.findById.mockRejectedValue(new Error('Database error'));

            await getBorrowal({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getAllBorrowals', () => {
        test('returns aggregated borrowals', async () => {
            const borrowals = [{ member: [], book: [] }];
            Borrowal.aggregate.mockResolvedValue(borrowals);

            await getAllBorrowals({}, res);

            expect(Borrowal.aggregate).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        $lookup: expect.objectContaining({
                            from: 'users'
                        })
                    }),
                    expect.objectContaining({
                        $lookup: expect.objectContaining({
                            from: 'books'
                        })
                    })
                ])
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                borrowalsList: borrowals
            });
        });

        test('returns 500 when aggregation fails', async () => {
            Borrowal.aggregate.mockRejectedValue(new Error('Database error'));

            await getAllBorrowals({}, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('addBorrowal', () => {
        test('returns 400 when body is missing', async () => {
            await addBorrowal({}, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(mongoose.startSession).not.toHaveBeenCalled();
        });

        test('returns 400 for invalid member ID', async () => {
            await addBorrowal({
                body: { memberId: 'invalid', bookId }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 for invalid book ID', async () => {
            await addBorrowal({
                body: { memberId: validId, bookId: 'invalid' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('creates borrowal and marks book unavailable', async () => {
            const session = createSession();
            const createdBorrowal = {
                memberId: new mongoose.Types.ObjectId(validId),
                bookId: new mongoose.Types.ObjectId(bookId)
            };

            Book.findById.mockReturnValue({
                session: jest.fn().mockResolvedValue({
                    isAvailable: true
                })
            });

            Borrowal.create.mockResolvedValue([createdBorrowal]);
            Book.findByIdAndUpdate.mockResolvedValue({
                isAvailable: false
            });

            await addBorrowal({
                body: {
                    memberId: validId,
                    bookId,
                    extra: 'ignored'
                }
            }, res);

            expect(session.withTransaction).toHaveBeenCalled();
            expect(Borrowal.create).toHaveBeenCalledWith(
                [{
                    memberId: new mongoose.Types.ObjectId(validId),
                    bookId: new mongoose.Types.ObjectId(bookId)
                }],
                { session }
            );
            expect(Book.findByIdAndUpdate).toHaveBeenCalledWith(
                bookId,
                { $set: { isAvailable: false } },
                { new: true, session }
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(session.endSession).toHaveBeenCalled();
        });

        test('returns 404 when book does not exist', async () => {
            const session = createSession();

            Book.findById.mockReturnValue({
                session: jest.fn().mockResolvedValue(null)
            });

            await addBorrowal({
                body: { memberId: validId, bookId }
            }, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(session.endSession).toHaveBeenCalled();
        });

        test('returns 409 when book is unavailable', async () => {
            const session = createSession();

            Book.findById.mockReturnValue({
                session: jest.fn().mockResolvedValue({
                    isAvailable: false
                })
            });

            await addBorrowal({
                body: { memberId: validId, bookId }
            }, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(session.endSession).toHaveBeenCalled();
        });

        test('returns 400 when transaction fails unexpectedly', async () => {
            const session = createSession();

            Book.findById.mockReturnValue({
                session: jest.fn().mockResolvedValue({
                    isAvailable: true
                })
            });

            Borrowal.create.mockRejectedValue(new Error('Database error'));

            await addBorrowal({
                body: { memberId: validId, bookId }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(session.endSession).toHaveBeenCalled();
        });
    });

    describe('updateBorrowal', () => {
        test('returns 400 for invalid borrowal ID', async () => {
            await updateBorrowal({
                params: { id: 'invalid' },
                body: { memberId: validId }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when no allowed fields are provided', async () => {
            await updateBorrowal({
                params: { id: validId },
                body: { extra: 'ignored' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 for invalid member ID', async () => {
            await updateBorrowal({
                params: { id: validId },
                body: { memberId: 'invalid' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 for invalid book ID', async () => {
            await updateBorrowal({
                params: { id: validId },
                body: { bookId: 'invalid' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when borrowal does not exist', async () => {
            Borrowal.findByIdAndUpdate.mockResolvedValue(null);

            await updateBorrowal({
                params: { id: validId },
                body: { memberId: bookId }
            }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('updates borrowal with ObjectId references', async () => {
            const updatedBorrowal = { memberId: validId };
            Borrowal.findByIdAndUpdate.mockResolvedValue(updatedBorrowal);

            await updateBorrowal({
                params: { id: validId },
                body: { memberId: bookId }
            }, res);

            expect(Borrowal.findByIdAndUpdate).toHaveBeenCalledWith(
                validId,
                { $set: { memberId: new mongoose.Types.ObjectId(bookId) } },
                { new: true, runValidators: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('returns 400 when update fails', async () => {
            Borrowal.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

            await updateBorrowal({
                params: { id: validId },
                body: { memberId: bookId }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('deleteBorrowal', () => {
        test('returns 400 for invalid ID', async () => {
            await deleteBorrowal({ params: { id: 'invalid' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when borrowal does not exist', async () => {
            Borrowal.findByIdAndDelete.mockResolvedValue(null);

            await deleteBorrowal({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('deletes borrowal and marks book available', async () => {
            const borrowal = {
                bookId: new mongoose.Types.ObjectId(bookId)
            };

            Borrowal.findByIdAndDelete.mockResolvedValue(borrowal);
            Book.findByIdAndUpdate.mockResolvedValue({
                isAvailable: true
            });

            await deleteBorrowal({ params: { id: validId } }, res);

            expect(Book.findByIdAndUpdate).toHaveBeenCalledWith(
                borrowal.bookId,
                { $set: { isAvailable: true } },
                { runValidators: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('returns 500 when deletion fails', async () => {
            Borrowal.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

            await deleteBorrowal({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('returns 500 when book availability update fails', async () => {
            Borrowal.findByIdAndDelete.mockResolvedValue({
                bookId: new mongoose.Types.ObjectId(bookId)
            });

            Book.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

            await deleteBorrowal({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
