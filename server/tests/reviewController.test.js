
jest.mock('../models/review', () => ({
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

const mongoose = require('mongoose');
const Review = require('../models/review');

const {
    getReview,
    getAllReviews,
    addReview,
    updateReview,
    deleteReview
} = require('../controllers/reviewController');

const createResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const validId = '507f1f77bcf86cd799439011';
const anotherValidId = '507f191e810c19729de860ea';

describe('reviewController', () => {
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        res = createResponse();
    });

    describe('getReview', () => {
        test('returns 400 for invalid ID', async () => {
            await getReview({ params: { id: 'invalid' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when review does not exist', async () => {
            Review.findById.mockResolvedValue(null);

            await getReview({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns review when found', async () => {
            const review = { star: '5' };
            Review.findById.mockResolvedValue(review);

            await getReview({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                review
            });
        });

        test('returns 500 when query fails', async () => {
            Review.findById.mockRejectedValue(new Error('Database error'));

            await getReview({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getAllReviews', () => {
        test('returns all reviews', async () => {
            const reviews = [{ star: '5' }, { star: '4' }];
            Review.find.mockResolvedValue(reviews);

            await getAllReviews({}, res);

            expect(Review.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                reviewsList: reviews
            });
        });

        test('returns 500 when query fails', async () => {
            Review.find.mockRejectedValue(new Error('Database error'));

            await getAllReviews({}, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('addReview', () => {
        test('returns 400 when body is missing', async () => {
            await addReview({}, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when body is an array', async () => {
            await addReview({ body: [] }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 for invalid bookID', async () => {
            await addReview({
                body: { bookID: 'invalid', star: '5' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when star is missing', async () => {
            await addReview({
                body: { bookID: validId }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when star is blank', async () => {
            await addReview({
                body: { bookID: validId, star: '   ' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when rating is not text', async () => {
            await addReview({
                body: { bookID: validId, star: '5', rating: 10 }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('creates review and trims text fields', async () => {
            const newReview = { bookID: validId, star: '5' };
            Review.create.mockResolvedValue(newReview);

            await addReview({
                body: {
                    bookID: validId,
                    star: ' 5 ',
                    rating: '  Excellent ',
                    extra: 'ignored'
                }
            }, res);

            expect(Review.create).toHaveBeenCalledWith({
                bookID: new mongoose.Types.ObjectId(validId),
                star: '5',
                rating: 'Excellent'
            });
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('returns 400 when creation fails', async () => {
            Review.create.mockRejectedValue(new Error('Database error'));

            await addReview({
                body: { bookID: validId, star: '5' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('updateReview', () => {
        test('returns 400 for invalid ID', async () => {
            await updateReview({
                params: { id: 'invalid' },
                body: { star: '4' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when body is missing', async () => {
            await updateReview({
                params: { id: validId }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when there are no allowed fields', async () => {
            await updateReview({
                params: { id: validId },
                body: { extra: 'ignored' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 for invalid bookID', async () => {
            await updateReview({
                params: { id: validId },
                body: { bookID: 'invalid' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when star is blank', async () => {
            await updateReview({
                params: { id: validId },
                body: { star: '   ' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when rating is not text', async () => {
            await updateReview({
                params: { id: validId },
                body: { rating: 123 }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when review does not exist', async () => {
            Review.findByIdAndUpdate.mockResolvedValue(null);

            await updateReview({
                params: { id: validId },
                body: { bookID: anotherValidId, star: '4' }
            }, res);

            expect(Review.findByIdAndUpdate).toHaveBeenCalledWith(
                validId,
                {
                    $set: {
                        bookID: new mongoose.Types.ObjectId(anotherValidId),
                        star: '4'
                    }
                },
                { new: true, runValidators: true }
            );
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('updates review and trims text fields', async () => {
            const updatedReview = { star: '4', rating: 'Good' };
            Review.findByIdAndUpdate.mockResolvedValue(updatedReview);

            await updateReview({
                params: { id: validId },
                body: {
                    star: ' 4 ',
                    rating: ' Good ',
                    extra: 'ignored'
                }
            }, res);

            expect(Review.findByIdAndUpdate).toHaveBeenCalledWith(
                validId,
                { $set: { star: '4', rating: 'Good' } },
                { new: true, runValidators: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('returns 400 when update fails', async () => {
            Review.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

            await updateReview({
                params: { id: validId },
                body: { star: '4' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('deleteReview', () => {
        test('returns 400 for invalid ID', async () => {
            await deleteReview({ params: { id: 'invalid' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when review does not exist', async () => {
            Review.findByIdAndDelete.mockResolvedValue(null);

            await deleteReview({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('deletes review successfully', async () => {
            const deletedReview = { star: '5' };
            Review.findByIdAndDelete.mockResolvedValue(deletedReview);

            await deleteReview({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                deletedReview
            });
        });

        test('returns 500 when deletion fails', async () => {
            Review.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

            await deleteReview({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
