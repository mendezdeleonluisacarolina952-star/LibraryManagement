
const Genre = require('../models/genre');

jest.mock('../models/genre', () => ({
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

const {
    getGenre,
    getAllGenres,
    addGenre,
    updateGenre,
    deleteGenre
} = require('../controllers/genreController');

const createResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const validId = '507f1f77bcf86cd799439011';

describe('genreController', () => {
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        res = createResponse();
    });

    describe('getGenre', () => {
        test('returns 400 for invalid ID', async () => {
            await getGenre({ params: { id: 'bad-id' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when params are missing', async () => {
            await getGenre({}, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when genre does not exist', async () => {
            Genre.findById.mockResolvedValue(null);

            await getGenre({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns genre when found', async () => {
            const genre = { name: 'Science' };
            Genre.findById.mockResolvedValue(genre);

            await getGenre({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                genre
            });
        });

        test('returns 500 when database query fails', async () => {
            Genre.findById.mockRejectedValue(new Error('Database error'));

            await getGenre({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getAllGenres', () => {
        test('returns all genres', async () => {
            const genres = [{ name: 'Science' }, { name: 'History' }];
            Genre.find.mockResolvedValue(genres);

            await getAllGenres({}, res);

            expect(Genre.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                genresList: genres
            });
        });

        test('returns 500 when query fails', async () => {
            Genre.find.mockRejectedValue(new Error('Database error'));

            await getAllGenres({}, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('addGenre', () => {
        test('returns 400 for missing body', async () => {
            await addGenre({}, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 for an array body', async () => {
            await addGenre({ body: [] }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when name is missing', async () => {
            await addGenre({ body: { description: 'Description' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when name is blank', async () => {
            await addGenre({ body: { name: '   ', description: 'Text' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when description is not text', async () => {
            await addGenre({ body: { name: 'Science', description: 123 } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('trims fields and ignores unapproved fields', async () => {
            const newGenre = { name: 'Science', description: 'Books' };
            Genre.create.mockResolvedValue(newGenre);

            await addGenre({
                body: {
                    name: ' Science ',
                    description: ' Books ',
                    unexpected: 'ignored'
                }
            }, res);

            expect(Genre.create).toHaveBeenCalledWith({
                name: 'Science',
                description: 'Books'
            });
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('returns 400 when creation fails', async () => {
            Genre.create.mockRejectedValue(new Error('Database error'));

            await addGenre({ body: { name: 'Science', description: 'Books' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('updateGenre', () => {
        test('returns 400 for invalid ID', async () => {
            await updateGenre({
                params: { id: 'bad-id' },
                body: { name: 'Science' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when body has no allowed fields', async () => {
            await updateGenre({
                params: { id: validId },
                body: { unknown: 'value' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when body is missing', async () => {
            await updateGenre({
                params: { id: validId }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when updated field is blank', async () => {
            await updateGenre({
                params: { id: validId },
                body: { name: '   ' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when genre does not exist', async () => {
            Genre.findByIdAndUpdate.mockResolvedValue(null);

            await updateGenre({
                params: { id: validId },
                body: { name: 'Science' }
            }, res);

            expect(Genre.findByIdAndUpdate).toHaveBeenCalledWith(
                validId,
                { $set: { name: 'Science' } },
                { new: true, runValidators: true }
            );
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('updates genre and trims field values', async () => {
            const updatedGenre = { name: 'Science' };
            Genre.findByIdAndUpdate.mockResolvedValue(updatedGenre);

            await updateGenre({
                params: { id: validId },
                body: { name: ' Science ', ignored: 'value' }
            }, res);

            expect(Genre.findByIdAndUpdate).toHaveBeenCalledWith(
                validId,
                { $set: { name: 'Science' } },
                { new: true, runValidators: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('returns 400 when update fails', async () => {
            Genre.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

            await updateGenre({
                params: { id: validId },
                body: { name: 'Science' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('deleteGenre', () => {
        test('returns 400 for invalid ID', async () => {
            await deleteGenre({ params: { id: 'bad-id' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when params are missing', async () => {
            await deleteGenre({}, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when genre does not exist', async () => {
            Genre.findByIdAndDelete.mockResolvedValue(null);

            await deleteGenre({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('deletes genre successfully', async () => {
            const deletedGenre = { name: 'Science' };
            Genre.findByIdAndDelete.mockResolvedValue(deletedGenre);

            await deleteGenre({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                deletedGenre
            });
        });

        test('returns 500 when deletion fails', async () => {
            Genre.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

            await deleteGenre({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
