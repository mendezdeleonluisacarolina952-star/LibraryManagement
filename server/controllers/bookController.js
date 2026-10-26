
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

const TEXT_FIELDS = ['name', 'isbn', 'summary', 'photoUrl'];
const REFERENCE_FIELDS = ['authorId', 'genreId'];

const isValidId = (id) =>
    typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);

const getAllowedFields = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }

    return ALLOWED_FIELDS.reduce((data, field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            data[field] = body[field];
        }  return data;
    }, {});
};

const validateRequiredText = (data, creating) => {
    for (const field of ['name', 'isbn']) {
        const value = data[field];

        if (
            (creating || value !== undefined) &&
            (typeof value !== 'string' || !value.trim())
        ) {
            return field === 'name'
                ? 'El nombre del libro es obligatorio'
                : 'El ISBN es obligatorio';
        }
    }

    return null;
};

const validateAvailability = (data) => {
    if (

        data.isAvailable !== undefined &&
        typeof data.isAvailable !== 'boolean'
    ) {
        return 'isAvailable debe ser booleano';
    }

    return null;
};

const validateReferences = (data) => {
    for (const field of REFERENCE_FIELDS) {
        const value = data[field];

        if (
            value !== undefined &&
            value !== null &&
            !isValidId(value)
        ) {
            return `${field} no contiene un ID valido`;
        }
    }

    return null;
};

const validateOptionalText = (data) => {
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

const validateBook = (data, creating = false) =>
    validateRequiredText(data, creating) ||
    validateAvailability(data) ||
    validateReferences(data) ||
    validateOptionalText(data);

const normalizeBookData = (data) => {
    const normalized = { ...data };

    for (const field of TEXT_FIELDS) {
        if (typeof normalized[field] === 'string') {
            normalized[field] = normalized[field].trim();
        }
    }

    for (const field of REFERENCE_FIELDS) {
        if (normalized[field]) {
            normalized[field] = new mongoose.Types.ObjectId(
                normalized[field]
            );
        }
    }

    return normalized;
};

const respondError = (res, status, message) =>
    res.status(status).json({
        success: false,
        message
    });

const getBook = async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
        return respondError(res, 400, 'ID de libro no valido');
    }

    try {
        const book = await Book.findById(id);

        if (!book) {
            return respondError(res, 404, 'Libro no encontrado');
        }

        return res.status(200).json({
            success: true,
            book
        });
    } catch {
        return respondError(
            res,
            500,
            'No se pudo consultar el libro'
        );
    }
};

const getAllBooks = async (_req, res) => {
    const pipeline = [
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
    ];

    try {
        const books = await Book.aggregate(pipeline);

        return res.status(200).json({
            success: true,
            booksList: books
        });
    } catch {
        return respondError(
            res,
            500,
            'No se pudieron consultar los libros'
        );
    }
};

const addBook = async (req, res) => {
    const data = getAllowedFields(req.body);

    if (!data) {
        return respondError(
            res,
            400,
            'Datos del libro no validos'
        );
    }

    const validationError = validateBook(data, true);

    if (validationError) {
        return respondError(res, 400, validationError);
    }

    try {
        const newBook = await Book.create(normalizeBookData(data));

        return res.status(201).json({
            success: true,
            newBook
        });
    } catch {
        return respondError(
            res,
            400,
            'No se pudo registrar el libro'
        );
    }
};

const updateBook = async (req, res) => {
    const { id } = req.params;
    const data = getAllowedFields(req.body);

    if (!isValidId(id)) {
        return respondError(res, 400, 'ID de libro no valido');
    }

    if (!data || Object.keys(data).length === 0) {
        return respondError(
            res,
            400,
            'No hay campos validos para actualizar'
        );
    }

    const validationError = validateBook(data);

    if (validationError) {
        return respondError(res, 400, validationError);
    }

    try {
        const updatedBook = await Book.findByIdAndUpdate(
            id,
            { $set: normalizeBookData(data) },
            { new: true, runValidators: true }
        );

        if (!updatedBook) {
            return respondError(res, 404, 'Libro no encontrado');
        }

        return res.status(200).json({
            success: true,
            updatedBook
        });
    } catch {
        return respondError(
            res,
            400,
            'No se pudo actualizar el libro'
        );
    }
};

const deleteBook = async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
        return respondError(res, 400, 'ID de libro no valido');
    }

    try {
        const deletedBook = await Book.findByIdAndDelete(id);

        if (!deletedBook) {
            return respondError(res, 404, 'Libro no encontrado');
        }

        return res.status(200).json({
            success: true,
            deletedBook
        });
    } catch {
        return respondError(
            res,
            500,
            'No se pudo eliminar el libro'
        );
    }
};

module.exports = {
    getBook,
    getAllBooks,
    addBook,
    updateBook,
    deleteBook
};
