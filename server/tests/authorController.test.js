
jest.mock('../models/author', () => ({
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

const Author = require('../models/author');

const {
    getAuthor,
    getAllAuthors,
    addAuthor,
    updateAuthor,
    deleteAuthor
} = require('../controllers/authorController');

const createResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const validId = '507f1f77bcf86cd799439011';

describe('authorController', () => {
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        res = createResponse();
    });

    describe('getAuthor', () => {
        test('returns 400 for invalid ID', async () => {
            await getAuthor({ params: { id: 'invalid' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when params are missing', async () => {
            await getAuthor({}, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when author does not exist', async () => {
            Author.findById.mockResolvedValue(null);

            await getAuthor({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns author when found', async () => {
            const author = { name: 'Author One' };
            Author.findById.mockResolvedValue(author);

            await getAuthor({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                author
            });
        });

        test('returns 500 when lookup fails', async () => {
            Author.findById.mockRejectedValue(new Error('Database error'));

            await getAuthor({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getAllAuthors', () => {
        test('returns all authors', async () => {
            const authors = [{ name: 'Author One' }, { name: 'Author Two' }];
            Author.find.mockResolvedValue(authors);

            await getAllAuthors({}, res);

            expect(Author.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                authorsList: authors
            });
        });

        test('returns 500 when lookup fails', async () => {
            Author.find.mockRejectedValue(new Error('Database error'));

            await getAllAuthors({}, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('addAuthor', () => {
        test('returns 400 when body is missing', async () => {
            await addAuthor({}, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when body is an array', async () => {
            await addAuthor({ body: [] }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when name is missing', async () => {
            await addAuthor({
                body: { description: 'Description' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when name is blank', async () => {
            await addAuthor({
                body: { name: '   ' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when description is not text', async () => {
            await addAuthor({
                body: { name: 'Author One', description: 123 }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when photoUrl is not text', async () => {
            await addAuthor({
                body: { name: 'Author One', photoUrl: false }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('creates author with trimmed allowed fields only', async () => {
            const newAuthor = {
                name: 'Author One',
                description: 'Biography',
                photoUrl: 'https://example.com/photo.jpg'
            };

            Author.create.mockResolvedValue(newAuthor);

            await addAuthor({
                body: {
                    name: ' Author One ',
                    description: ' Biography ',
                    photoUrl: ' https://example.com/photo.jpg ',
                    extra: 'ignored'
                }
            }, res);

            expect(Author.create).toHaveBeenCalledWith({
                name: 'Author One',
                description: 'Biography',
                photoUrl: 'https://example.com/photo.jpg'
            });
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('returns 400 when creation fails', async () => {
            Author.create.mockRejectedValue(new Error('Database error'));

            await addAuthor({
                body: { name: 'Author One' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('updateAuthor', () => {
        test('returns 400 for invalid ID', async () => {
            await updateAuthor({
                params: { id: 'invalid' },
                body: { name: 'Author Two' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when body is missing', async () => {
            await updateAuthor({
                params: { id: validId }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when no allowed fields are provided', async () => {
            await updateAuthor({
                params: { id: validId },
                body: { extra: 'ignored' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when name is blank', async () => {
            await updateAuthor({
                params: { id: validId },
                body: { name: '   ' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when description is not text', async () => {
            await updateAuthor({
                params: { id: validId },
                body: { description: 123 }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when author does not exist', async () => {
            Author.findByIdAndUpdate.mockResolvedValue(null);

            await updateAuthor({
                params: { id: validId },
                body: { name: 'Author Two' }
            }, res);

            expect(Author.findByIdAndUpdate).toHaveBeenCalledWith(
                validId,
                { $set: { name: 'Author Two' } },
                { new: true, runValidators: true }
            );
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('updates author and trims field values', async () => {
            const updatedAuthor = { name: 'Author Two' };
            Author.findByIdAndUpdate.mockResolvedValue(updatedAuthor);

            await updateAuthor({
                params: { id: validId },
                body: {
                    name: ' Author Two ',
                    description: ' Biography ',
                    extra: 'ignored'
                }
            }, res);

            expect(Author.findByIdAndUpdate).toHaveBeenCalledWith(
                validId,
                {
                    $set: {
                        name: 'Author Two',
                        description: 'Biography'
                    }
                },
                { new: true, runValidators: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('returns 400 when update fails', async () => {
            Author.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

            await updateAuthor({
                params: { id: validId },
                body: { name: 'Author Two' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('deleteAuthor', () => {
        test('returns 400 for invalid ID', async () => {
            await deleteAuthor({ params: { id: 'invalid' } }, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when params are missing', async () => {
            await deleteAuthor({}, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when author does not exist', async () => {
            Author.findByIdAndDelete.mockResolvedValue(null);

            await deleteAuthor({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('deletes author successfully', async () => {
            const deletedAuthor = { name: 'Author One' };
            Author.findByIdAndDelete.mockResolvedValue(deletedAuthor);

            await deleteAuthor({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                deletedAuthor
            });
        });

        test('returns 500 when deletion fails', async () => {
            Author.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

            await deleteAuthor({ params: { id: validId } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
