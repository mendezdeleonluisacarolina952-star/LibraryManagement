
jest.mock('../models/member', () => ({
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

const Member = require('../models/member');

const {
    getMember,
    getAllMembers,
    addMember,
    updateMember,
    deleteMember
} = require('../controllers/memberController');

const VALID_ID = '507f1f77bcf86cd799439011';

const createResponse = () => {
    const res = {
        status: jest.fn(),
        json: jest.fn()
    };

    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);

    return res;
};

const validMember = () => ({
    memberName: 'Maria Lopez',
    nic: 123456,
    phone: 55512345,
    email: 'maria@example.com'
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Pruebas unitarias del controlador de miembros', () => {
    test('TM-01: consulta un miembro por ID', async () => {
        const member = { _id: VALID_ID, ...validMember() };
        Member.findById.mockResolvedValue(member);

        const req = { params: { id: VALID_ID } };
        const res = createResponse();

        await getMember(req, res);

        expect(Member.findById).toHaveBeenCalledWith(VALID_ID);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            member
        });
    });

    test('TM-02: rechaza un ID invalido al consultar', async () => {
        const req = { params: { id: '123' } };
        const res = createResponse();

        await getMember(req, res);

        expect(Member.findById).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TM-03: responde 404 si el miembro no existe', async () => {
        Member.findById.mockResolvedValue(null);

        const req = { params: { id: VALID_ID } };
        const res = createResponse();

        await getMember(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Miembro no encontrado'
        });
    });

    test('TM-04: maneja error al consultar un miembro', async () => {
        Member.findById.mockRejectedValue(new Error('Database error'));

        const req = { params: { id: VALID_ID } };
        const res = createResponse();

        await getMember(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Error al consultar el miembro'
        });
    });

    test('TM-05: obtiene la lista de miembros', async () => {
        const members = [{ _id: VALID_ID, ...validMember() }];
        Member.find.mockResolvedValue(members);

        const res = createResponse();

        await getAllMembers({}, res);

        expect(Member.find).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            membersList: members
        });
    });

    test('TM-06: maneja error al listar miembros', async () => {
        Member.find.mockRejectedValue(new Error('Database error'));

        const res = createResponse();

        await getAllMembers({}, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Error al consultar los miembros'
        });
    });

    test('TM-07: registra un miembro correctamente', async () => {
        const member = {
            _id: VALID_ID,
            memberName: 'Maria Lopez',
            nic: 123456,
            phone: 55512345,
            email: 'maria@example.com'
        };

        Member.create.mockResolvedValue(member);

        const req = {
            body: {
                ...validMember(),
                email: ' MARIA@EXAMPLE.COM ',
                memberName: ' Maria Lopez ',
                isAdmin: true
            }
        };

        const res = createResponse();

        await addMember(req, res);

        expect(Member.create).toHaveBeenCalledWith({
            memberName: 'Maria Lopez',
            nic: 123456,
            phone: 55512345,
            email: 'maria@example.com'
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            newMember: member
        });
    });

    test('TM-08: rechaza datos de miembro invalidos', async () => {
        const req = { body: null };
        const res = createResponse();

        await addMember(req, res);

        expect(Member.create).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Datos de miembro no validos'
        });
    });

    test('TM-09: rechaza crear miembro sin nombre', async () => {
        const req = {
            body: {
                nic: 123456,
                phone: 55512345
            }
        };

        const res = createResponse();

        await addMember(req, res);

        expect(Member.create).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'memberName es obligatorio y debe ser texto'
        });
    });

    test('TM-10: rechaza un numero de identificacion invalido', async () => {
        const req = {
            body: {
                memberName: 'Maria Lopez',
                nic: 'abc',
                phone: 55512345
            }
        };

        const res = createResponse();

        await addMember(req, res);

        expect(Member.create).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'nic debe ser un numero entero valido'
        });
    });

    test('TM-11: rechaza un correo invalido', async () => {
        const req = {
            body: {
                ...validMember(),
                email: 'correo-invalido'
            }
        };

        const res = createResponse();

        await addMember(req, res);

        expect(Member.create).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Correo electronico no valido'
        });
    });

    test('TM-12: maneja error al crear un miembro', async () => {
        Member.create.mockRejectedValue(new Error('Database error'));

        const req = { body: validMember() };
        const res = createResponse();

        await addMember(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'No se pudo registrar el miembro'
        });
    });

    test('TM-13: actualiza un miembro correctamente', async () => {
        const updatedMember = {
            _id: VALID_ID,
            memberName: 'Maria Actualizada'
        };

        Member.findByIdAndUpdate.mockResolvedValue(updatedMember);

        const req = {
            params: { id: VALID_ID },
            body: { memberName: ' Maria Actualizada ' }
        };

        const res = createResponse();

        await updateMember(req, res);

        expect(Member.findByIdAndUpdate).toHaveBeenCalledWith(
            VALID_ID,
            { $set: { memberName: 'Maria Actualizada' } },
            { new: true, runValidators: true }
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            updatedMember
        });
    });

    test('TM-14: rechaza ID invalido al actualizar', async () => {
        const req = {
            params: { id: '123' },
            body: { memberName: 'Maria' }
        };

        const res = createResponse();

        await updateMember(req, res);

        expect(Member.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TM-15: rechaza actualizacion sin campos permitidos', async () => {
        const req = {
            params: { id: VALID_ID },
            body: { isAdmin: true }
        };

        const res = createResponse();

        await updateMember(req, res);

        expect(Member.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TM-16: responde 404 al actualizar un miembro inexistente', async () => {
        Member.findByIdAndUpdate.mockResolvedValue(null);

        const req = {
            params: { id: VALID_ID },
            body: { memberName: 'Maria' }
        };

        const res = createResponse();

        await updateMember(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('TM-17: maneja error al actualizar un miembro', async () => {
        Member.findByIdAndUpdate.mockRejectedValue(
            new Error('Database error')
        );

        const req = {
            params: { id: VALID_ID },
            body: { memberName: 'Maria' }
        };

        const res = createResponse();

        await updateMember(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'No se pudo actualizar el miembro'
        });
    });

    test('TM-18: elimina un miembro correctamente', async () => {
        const member = { _id: VALID_ID, memberName: 'Maria Lopez' };
        Member.findByIdAndDelete.mockResolvedValue(member);

        const req = { params: { id: VALID_ID } };
        const res = createResponse();

        await deleteMember(req, res);

        expect(Member.findByIdAndDelete).toHaveBeenCalledWith(VALID_ID);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            deletedMember: member
        });
    });

    test('TM-19: rechaza ID invalido al eliminar', async () => {
        const req = { params: { id: '123' } };
        const res = createResponse();

        await deleteMember(req, res);

        expect(Member.findByIdAndDelete).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TM-20: responde 404 al eliminar miembro inexistente', async () => {
        Member.findByIdAndDelete.mockResolvedValue(null);

        const req = { params: { id: VALID_ID } };
        const res = createResponse();

        await deleteMember(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('TM-21: maneja error al eliminar un miembro', async () => {
        Member.findByIdAndDelete.mockRejectedValue(
            new Error('Database error')
        );

        const req = { params: { id: VALID_ID } };
        const res = createResponse();

        await deleteMember(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Error al eliminar el miembro'
        });
    });
});
