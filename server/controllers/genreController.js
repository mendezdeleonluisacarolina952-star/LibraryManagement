
const Genre = require('../models/genre');

const ALLOWED_FIELDS = Object.freeze(['name', 'description']);

const isValidId = (id) =>
    typeof id === 'string' &&
    /^[a-fA-F0-9]{24}$/.test(id);

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

const validateGenre = (data, creating = false) => {
    for (const field of ALLOWED_FIELDS) {

        if (
            (creating || data[field] !== undefined) &&
            (
                typeof data[field] !== 'string' ||
                !data[field].trim()
            )
        ) {
            return `${field} es obligatorio y debe ser texto`;
        }
    }
    return null;
};

const normalizeGenre = (data) => {
    const normalized = { ...data };

    for (const field of ALLOWED_FIELDS) {
        if (typeof normalized[field] === 'string') {
            normalized[field] = normalized[field].trim();
        }
    }

    return normalized;
};
const getGenre = async (req, res) => {
    if (!req.params || !isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de genero no valido'
        });
    }

    try {
        const genre = await Genre.findById(req.params.id);

        if (!genre) {
            return res.status(404).json({
                success: false,
                message: 'Genero no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            genre
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudo consultar el genero'
        });
    }
};

const getAllGenres = async (_req, res) => {
    try {
        const genres = await Genre.find({});

        return res.status(200).json({
            success: true,
            genresList: genres
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudieron consultar los generos'
        });
    }
};


const addGenre = async (req, res) => {
    const data = getAllowedFields(req.body);

    if (!data) {
        return res.status(400).json({
            success: false,
            message: 'Datos del genero no validos'
        });
    }

    const error = validateGenre(data, true);

    if (error) {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    const normalizedData = normalizeGenre(data);

    try {
        const newGenre = await Genre.create(normalizedData);

        return res.status(201).json({
            success: true,
            newGenre
        });
    } catch {
        return res.status(400).json({
            success: false,
            message: 'No se pudo registrar el genero'
        });
    }
};


const updateGenre = async (req, res) => {
    const id = req.params && req.params.id;
    const data = getAllowedFields(req.body);

    if (!isValidId(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de genero no valido'
        });
    }

    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No hay campos validos para actualizar'
        });
    }

    const error = validateGenre(data);

    if (error) {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    const normalizedData = normalizeGenre(data);

    try {
        const genre = await Genre.findByIdAndUpdate(
            id,
            { $set: normalizedData },
            {
                new: true,
                runValidators: true
            }
        );

        if (!genre) {
            return res.status(404).json({
                success: false,
                message: 'Genero no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            updatedGenre: genre
        });
    } catch {
        return res.status(400).json({
            success: false,
            message: 'No se pudo actualizar el genero'
        });
    }
};


const deleteGenre = async (req, res) => {
    if (!req.params || !isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de genero no valido'
        });
    }

    try {
        const genre = await Genre.findByIdAndDelete(req.params.id);

        if (!genre) {
            return res.status(404).json({
                success: false,
                message: 'Genero no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            deletedGenre: genre
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudo eliminar el genero'
        });
    }
};

module.exports = {
    getGenre,
    getAllGenres,
    addGenre,
    updateGenre,
    deleteGenre
};
