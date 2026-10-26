
const Author = require('../models/author');

const ALLOWED_FIELDS = Object.freeze([
    'name',
    'description',
    'photoUrl'
]);

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

const validateAuthor = (data, creating = false) => {
    if (
        (creating || data.name !== undefined) &&
        (
            typeof data.name !== 'string' ||
            !data.name.trim()
        )
    ) {
        return 'El nombre del autor es obligatorio';
    }

    for (const field of ['description', 'photoUrl']) {
        if (
            data[field] !== undefined &&
            typeof data[field] !== 'string'
        ) {
            return `${field} debe ser texto`;
        }
    }

    return null;
};

const normalizeAuthor = (data) => {
    const normalized = { ...data };

    for (const field of ['name', 'description', 'photoUrl']) {
        if (typeof normalized[field] === 'string') {
            normalized[field] = normalized[field].trim();
        }
    }

    return normalized;
};

const getAuthor = async (req, res) => {
    if (!req.params || !isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de autor no valido'
        });
    }

    try {
        const author = await Author.findById(req.params.id);

        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Autor no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            author
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudo consultar el autor'
        });
    }
};

const getAllAuthors = async (_req, res) => {
    try {
        const authors = await Author.find({});

        return res.status(200).json({
            success: true,
            authorsList: authors
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudieron consultar los autores'
        });
    }
};


const addAuthor = async (req, res) => {
    const data = getAllowedFields(req.body);

    if (!data) {
        return res.status(400).json({
            success: false,
            message: 'Datos del autor no validos'
        });
    }

    const error = validateAuthor(data, true);

    if (error) {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    const normalizedData = normalizeAuthor(data);

    try {
        const newAuthor = await Author.create(normalizedData);

        return res.status(201).json({
            success: true,
            newAuthor
        });
    } catch {
        return res.status(400).json({
            success: false,
            message: 'No se pudo registrar el autor'
        });
    }
};


const updateAuthor = async (req, res) => {
    const id = req.params && req.params.id;
    const data = getAllowedFields(req.body);

    if (!isValidId(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de autor no valido'
        });
    }

    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No hay campos validos para actualizar'
        });
    }

    const error = validateAuthor(data);

    if (error) {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    const normalizedData = normalizeAuthor(data);

    try {
        const author = await Author.findByIdAndUpdate(
            id,
            { $set: normalizedData },
            {
                new: true,
                runValidators: true
            }
        );

        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Autor no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            updatedAuthor: author
        });
    } catch {
        return res.status(400).json({
            success: false,
            message: 'No se pudo actualizar el autor'
        });
    }
};


const deleteAuthor = async (req, res) => {
    if (!req.params || !isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de autor no valido'
        });
    }

    try {
        const author = await Author.findByIdAndDelete(req.params.id);

        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Autor no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            deletedAuthor: author
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'No se pudo eliminar el autor'
        });
    }
};

module.exports = {
    getAuthor,
    getAllAuthors,
    addAuthor,
    updateAuthor,
    deleteAuthor
};
