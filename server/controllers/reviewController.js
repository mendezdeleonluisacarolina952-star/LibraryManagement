
const mongoose = require('mongoose');
const Review = require('../models/review');

const ALLOWED_FIELDS = ['bookID', 'star', 'rating'];

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

const validateReview = (data, creating = false) => {
    if (
        (creating || data.bookID !== undefined) &&
        !isValidId(data.bookID)
    ) {
        return 'bookID debe ser un ID valido';
    }
    if (
        (creating || data.star !== undefined) &&
        (typeof data.star !== 'string' || !data.star.trim())
    ) {
        return 'star es obligatorio y debe ser texto';
    }

    if (
        data.rating !== undefined &&
        typeof data.rating !== 'string'
    ) {
        return 'rating debe ser texto';
    }

    return null;
};
const getReview = async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de resena no valido'
        });
    }

    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Resena no encontrada'
            });
        }

        return res.status(200).json({
            success: true,
            review
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'Error al consultar la resena'
        });
    }
};

const getAllReviews = async (_req, res) => {
    try {
        const reviews = await Review.find({});

        return res.status(200).json({
            success: true,
            reviewsList: reviews
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'Error al consultar las resenas'
        });
    }
};


const addReview = async (req, res) => {
    const data = getAllowedFields(req.body);

    if (!data) {
        return res.status(400).json({
            success: false,
            message: 'Datos de resena no validos'
        });
    }

    const error = validateReview(data, true);

    if (error) {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    data.bookID = new mongoose.Types.ObjectId(data.bookID);
    data.star = data.star.trim();

    if (typeof data.rating === 'string') {
        data.rating = data.rating.trim();
    }

    try {
        const newReview = await Review.create(data);

        return res.status(201).json({
            success: true,
            newReview
        });
    } catch {
        return res.status(400).json({
            success: false,
            message: 'No se pudo registrar la resena'
        });
    }
};


const updateReview = async (req, res) => {
    const { id } = req.params;
    const data = getAllowedFields(req.body);

    if (!isValidId(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de resena no valido'
        });
    }

    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No hay campos validos para actualizar'
        });
    }

    const error = validateReview(data);

    if (error) {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    if (data.bookID !== undefined) {
        data.bookID = new mongoose.Types.ObjectId(data.bookID);
    }

    for (const field of ['star', 'rating']) {
        if (typeof data[field] === 'string') {
            data[field] = data[field].trim();
        }


    }

    try {
        const review = await Review.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Resena no encontrada'
            });
        }

        return res.status(200).json({
            success: true,
            updatedReview: review
        });
    } catch {
        return res.status(400).json({
            success: false,
            message: 'No se pudo actualizar la resena'
        });
    }
};


const deleteReview = async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de resena no valido'
        });
    }

    try {
        const review = await Review.findByIdAndDelete(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Resena no encontrada'
            });
        }

        return res.status(200).json({
            success: true,
            deletedReview: review
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar la resena'
        });
    }
};

module.exports = {
    getReview,
    getAllReviews,
    addReview,
    updateReview,
    deleteReview
};
