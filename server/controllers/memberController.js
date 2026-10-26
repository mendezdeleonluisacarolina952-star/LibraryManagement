

const Member = require('../models/member');

const ALLOWED_FIELDS = [
    'memberName',
    'address',
    'occupation',
    'nic',
    'phone',
    'status',
    'email',
    'photoUrl'
];

const NUMERIC_FIELDS = ['nic', 'phone'];
const TEXT_FIELDS = [
    'memberName',
    'address',
    'occupation',
    'status',
    'email',
    'photoUrl'
];
const OPTIONAL_TEXT_FIELDS = [
    'address',
    'occupation',
    'status',
    'email',
    'photoUrl'
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_REGEX = /^[a-fA-F0-9]{24}$/;
const INTEGER_REGEX = /^\d+$/;

const isValidId = (id) =>
    typeof id === 'string' && ID_REGEX.test(id);

const respondError = (res, status, message) =>
    res.status(status).json({
        success: false,
        message
    });

const getAllowedFields = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }

    return ALLOWED_FIELDS.reduce((data, field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            data[field] = body[field];
        } return data;
    }, {});
};

const validateMemberName = (data, creating) => {
    if (
        (creating || data.memberName !== undefined) &&
        (
            typeof data.memberName !== 'string' ||
            !data.memberName.trim()
        )
    ) {
        return 'memberName es obligatorio y debe ser texto';
    }

    return null;
};

const validateNumericFields = (data, creating) => {
    for (const field of NUMERIC_FIELDS) {
        const value = data[field];

        if (value === undefined && !creating) {
            continue;
        }

        if (
            value === undefined ||
            value === null ||
            value === '' ||
            !INTEGER_REGEX.test(String(value)) ||
            !Number.isSafeInteger(Number(value))
        ) {
            return `${field} debe ser un numero entero valido`;
        }

        data[field] = Number(value);
    }
    return null;
};

const validateTextFields = (data) => {
    for (const field of TEXT_FIELDS) {
        if (
            data[field] !== undefined &&
            typeof data[field] !== 'string'
        ) {
            return `${field} debe ser texto`;
        }
    }




    return null;
};

const validateEmail = (data) => {
    const email = data.email;

    if (
        email !== undefined &&
        email.trim() !== '' &&
        !EMAIL_REGEX.test(email.trim())
    ) {
        return 'Correo electronico no valido';
    }

    return null;
};

const validateMember = (data, creating = false) =>
    validateMemberName(data, creating) ||
    validateNumericFields(data, creating) ||
    validateTextFields(data) ||
    validateEmail(data);

const normalizeMemberData = (data) => {
    const normalized = { ...data };

    for (const field of TEXT_FIELDS) {
        if (typeof normalized[field] === 'string') {
            normalized[field] = normalized[field].trim();
        }
    }

    if (typeof normalized.email === 'string') {
        normalized.email = normalized.email.toLowerCase();
    }

    return normalized;
};

const getMember = async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
        return respondError(res, 400, 'ID de miembro no valido');
    }

    try {
        const member = await Member.findById(id);

        if (!member) {
            return respondError(res, 404, 'Miembro no encontrado');
        }

        return res.status(200).json({
            success: true,
            member
        });
    } catch {
        return respondError(
            res,
            500,
            'Error al consultar el miembro'
        );
    }
};

const getAllMembers = async (_req, res) => {
    try {
        const membersList = await Member.find({});

        return res.status(200).json({
            success: true,
            membersList
        });
    } catch {
        return respondError(
            res,
            500,
            'Error al consultar los miembros'
        );
    }
};


const addMember = async (req, res) => {
    const data = getAllowedFields(req.body);

    if (!data) {
        return respondError(
            res,
            400,
            'Datos de miembro no validos'
        );
    }

    const validationError = validateMember(data, true);

    if (validationError) {
        return respondError(res, 400, validationError);
    }

    try {
        const newMember = await Member.create(
            normalizeMemberData(data)
        );

        return res.status(201).json({
            success: true,
            newMember
        });
    } catch {
        return respondError(
            res,
            400,
            'No se pudo registrar el miembro'
        );
    }
};


const updateMember = async (req, res) => {
    const { id } = req.params;
    const data = getAllowedFields(req.body);

    if (!isValidId(id)) {
        return respondError(res, 400, 'ID de miembro no valido');
    }

    if (!data || Object.keys(data).length === 0) {
        return respondError(
            res,
            400,
            'No hay campos validos para actualizar'
        );
    }

    const validationError = validateMember(data);

    if (validationError) {
        return respondError(res, 400, validationError);
    }

    try {
        const updatedMember = await Member.findByIdAndUpdate(
            id,
            { $set: normalizeMemberData(data) },
            { new: true, runValidators: true }
        );

        if (!updatedMember) {
            return respondError(res, 404, 'Miembro no encontrado');
        }

        return res.status(200).json({
            success: true,
            updatedMember
        });
    } catch {
        return respondError(
            res,
            400,
            'No se pudo actualizar el miembro'
        );
    }
};


const deleteMember = async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
        return respondError(res, 400, 'ID de miembro no valido');
    }

    try {
        const deletedMember = await Member.findByIdAndDelete(id);

        if (!deletedMember) {
            return respondError(res, 404, 'Miembro no encontrado');
        }

        return res.status(200).json({
            success: true,
            deletedMember
        });
    } catch {
        return respondError(
            res,
            500,
            'Error al eliminar el miembro'
        );
    }
};

module.exports = {
    getMember,
    getAllMembers,
    addMember,
    updateMember,
    deleteMember
};
