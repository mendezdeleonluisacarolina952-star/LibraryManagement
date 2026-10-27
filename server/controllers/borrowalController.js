const mongoose = require('mongoose');
const Borrowal = require('../models/borrowal');
const Book = require('../models/book');

const isValidId = (id) =>
    typeof id === 'string' &&
    /^[a-fA-F0-9]{24}$/.test(id);

const getAllowedFields = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }

    const data = {};

    for (const field of ['memberId', 'bookId']) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            data[field] = body[field];
        }
    }

    return data;
};

const getBorrowal = async (req, res) => {
    if (!req.params || !isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de prestamo no valido'
        });
    }

    try {
        const borrowal = await Borrowal.findById(req.params.id);

        if (!borrowal) {
            return res.status(404).json({
                success: false,
                message: 'Prestamo no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            borrowal
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudo consultar el prestamo'
        });
    }
};

const getAllBorrowals = async (_req, res) => {
    try {
        const borrowals = await Borrowal.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'member'
                }
            },

            {
                $unwind: {
                    path: '$member',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'books',
                    localField: 'bookId',
                    foreignField: '_id',
                    as: 'book'
                }
            },

            {
                $unwind: {
                    path: '$book',
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            borrowalsList: borrowals
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudieron consultar los prestamos'
        });
    }
};

const addBorrowal = async (req, res) => {
    const data = getAllowedFields(req.body);

    if (
        !data ||
        !isValidId(data.memberId) ||
        !isValidId(data.bookId)
    ) {
        return res.status(400).json({
            success: false,
            message: 'memberId y bookId deben ser IDs validos'
        });
    }

    let session;

    try {
        session = await mongoose.startSession();

        let created;

        await session.withTransaction(async () => {
            const book = await Book.findById(data.bookId).session(session);

            if (!book) {
                throw Object.assign(
                    new Error('Libro no encontrado'),
                    { statusCode: 404 }
                );
            }

            if (book.isAvailable === false) {
                throw Object.assign(
                    new Error('El libro no esta disponible'),
                    { statusCode: 409 }
                );
            }

            const [borrowal] = await Borrowal.create(
                [{
                    memberId: new mongoose.Types.ObjectId(data.memberId),
                    bookId: new mongoose.Types.ObjectId(data.bookId)
                }],
                { session }
            );

            await Book.findByIdAndUpdate(
                data.bookId,
                { $set: { isAvailable: false } },
                { new: true, session }
            );

            created = borrowal;
        });

        return res.status(201).json({
            success: true,
            newBorrowal: created
        });
    } catch (err) {
        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.statusCode
                ? err.message
                : 'No se pudo registrar el prestamo'
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

const updateBorrowal = async (req, res) => {
    const id = req.params && req.params.id;
    const data = getAllowedFields(req.body);

    if (!isValidId(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de prestamo no valido'
        });
    }

    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No hay campos validos para actualizar'
        });
    }

    if (
        data.memberId !== undefined &&
        !isValidId(data.memberId)
    ) {
        return res.status(400).json({
            success: false,
            message: 'memberId no valido'
        });
    }

    if (
        data.bookId !== undefined &&
        !isValidId(data.bookId)
    ) {
        return res.status(400).json({
            success: false,
            message: 'bookId no valido'
        });
    }

    for (const field of ['memberId', 'bookId']) {
        if (data[field] !== undefined) {
            data[field] = new mongoose.Types.ObjectId(data[field]);
        }
    }

    try {
        const borrowal = await Borrowal.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!borrowal) {
            return res.status(404).json({
                success: false,
                message: 'Prestamo no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            updatedBorrowal: borrowal
        });
    } catch {
        return res.status(400).json({
            success: false,
            message: 'No se pudo actualizar el prestamo'
        });
    }
};

const deleteBorrowal = async (req, res) => {
    if (!req.params || !isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de prestamo no valido'
        });
    }

    try {
        const borrowal = await Borrowal.findByIdAndDelete(req.params.id);

        if (!borrowal) {
            return res.status(404).json({
                success: false,
                message: 'Prestamo no encontrado'
            });
        }

        await Book.findByIdAndUpdate(
            borrowal.bookId,
            { $set: { isAvailable: true } },
            { runValidators: true }
        );

        return res.status(200).json({
            success: true,
            deletedBorrowal: borrowal
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudo eliminar el prestamo'
        });

    }
};

module.exports = {
    getBorrowal,
    getAllBorrowals,
    addBorrowal,
    updateBorrowal,
    deleteBorrowal
};