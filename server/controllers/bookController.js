const Book = require('../models/book');
const mongoose = require('mongoose');

const ALLOWED_FIELDS = [
    'name',
    'isbn',
    'authorId',
    'genreId',
    'isAvailable',
    'summary',
    'photoUrl'
];

const isValidId = (id) =>
    typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);

const getAllowedFields = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }

    const data = {};

    for (const field of ALLOWED_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            data[field] = body[field];
        }
    }

    return data;
};

const validateBook = (data, creating = false) => {
    for (const field of ['name', 'isbn']) {
        if (
            (creating || data[field] !== undefined) &&
            (typeof data[field] !== 'string' || !data[field].trim())
        ) {
            return `${field === 'name' ? 'El nombre del libro' : 'El ISBN'} es obligatorio`;
        }
    }

    if (
        (creating || data.isAvailable !== undefined) &&
        data.isAvailable !== undefined &&
        typeof data.isAvailable !== 'boolean'
    ) {
        return 'isAvailable debe ser booleano';
    }

    for (const field of ['authorId', 'genreId']) {
        if (
            data[field] !== undefined &&
            data[field] !== null &&
            !isValidId(data[field])
        ) {
            return `${field} no contiene un ID valido`;
        }
    }

    for (const field of ['summary', 'photoUrl']) {
        if (
            data[field] !== undefined &&
            typeof data[field] !== 'string'
        ) {
            return `${field} debe ser texto`;
        }
    }

    return null;
};

const getBook = async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de libro no valido'
        });
    }

    try {
        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Libro no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            book
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudo consultar el libro'
        });
    }
};

const getAllBooks = async (_req, res) => {
    try {
        const books = await Book.aggregate([
            {
                $lookup: {
                    from: 'authors',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $unwind: {
                    path: '$author',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'genres',
                    localField: 'genreId',
                    foreignField: '_id',
                    as: 'genre'
                }
            },
            {
                $unwind: {
                    path: '$genre',
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            booksList: books
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudieron consultar los libros'
        });
    }
};

const addBook = async (req, res) => {
    const data = getAllowedFields(req.body);

    if (!data) {
        return res.status(400).json({
            success: false,
            message: 'Datos del libro no validos'
        });
    }

    const error = validateBook(data, true);

    if (error) {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    data.name = data.name.trim();
    data.isbn = data.isbn.trim();

    for (const field of ['authorId', 'genreId']) {
        if (data[field]) {
            data[field] = new mongoose.Types.ObjectId(data[field]);
        }
    }

    if (data.summary !== undefined) {
        data.summary = data.summary.trim();
    }

    if (data.photoUrl !== undefined) {
        data.photoUrl = data.photoUrl.trim();
    }

    try {
        return res.status(201).json({
            success: true,
            newBook: await Book.create(data)
        });
    } catch {
        return res.status(400).json({
            success: false,
            message: 'No se pudo registrar el libro'
        });
    }
};

const updateBook = async (req, res) => {
    const { id } = req.params;
    const data = getAllowedFields(req.body);

    if (!isValidId(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de libro no valido'
        });
    }

    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No hay campos validos para actualizar'
        });
    }

    const error = validateBook(data);

    if (error) {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    for (const field of ['name', 'isbn', 'summary', 'photoUrl']) {
        if (typeof data[field] === 'string') {
            data[field] = data[field].trim();
        }
    }

    for (const field of ['authorId', 'genreId']) {
        if (data[field]) {
            data[field] = new mongoose.Types.ObjectId(data[field]);
        }
    }

    try {
        const book = await Book.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Libro no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            updatedBook: book
        });
    } catch {
        return res.status(400).json({
            success: false,
            message: 'No se pudo actualizar el libro'
        });
    }
};

const deleteBook = async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de libro no valido'
        });
    }

    try {
        const book = await Book.findByIdAndDelete(req.params.id);

        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Libro no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            deletedBook: book
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudo eliminar el libro'
        });
    }
};

module.exports = {
    getBook,
    getAllBooks,
    addBook,
    updateBook,
    deleteBook
};