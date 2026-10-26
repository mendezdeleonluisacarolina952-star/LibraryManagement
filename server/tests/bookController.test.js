
jest.mock('../models/book', () => ({
    findById: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

const Book = require('../models/book');

const {
    getBook,
    getAllBooks,
    addBook,
    updateBook,
    deleteBook
} = require('../controllers/bookController');

const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_AUTHOR_ID = '507f1f77bcf86cd799439012';
const VALID_GENRE_ID = '507f1f77bcf86cd799439013';

const validBook = {
    name: 'Libro de prueba',
    isbn: '9781234567890',
    isAvailable: true
};

const createResponse = () => {
    const res = {
        status: jest.fn(),
        json: jest.fn()
    };

    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);

    return res;
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Pruebas unitarias del controlador de libros', () => {
    describe('getBook', () => {
        test('TB-01: consulta un libro por ID', async () => {
            const book = { _id: VALID_ID, name: 'Libro de prueba' };
            Book.findById.mockResolvedValue(book);

            const req = { params: { id: VALID_ID } };
            const res = createResponse();

            await getBook(req, res);

            expect(Book.findById).toHaveBeenCalledWith(VALID_ID);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, book });
        });

        test('rechaza un ID invalido', async () => {
            const res = createResponse();

            await getBook({ params: { id: '123' } }, res);

            expect(Book.findById).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('responde 404 si el libro no existe', async () => {
            Book.findById.mockResolvedValue(null);
            const res = createResponse();

            await getBook({ params: { id: VALID_ID } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Libro no encontrado'
            });
        });

        test('maneja un error al consultar un libro', async () => {
            Book.findById.mockRejectedValue(new Error('Database error'));
            const res = createResponse();

            await getBook({ params: { id: VALID_ID } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'No se pudo consultar el libro'
            });
        });
    });

    describe('getAllBooks', () => {
        test('TB-03: obtiene la lista de libros', async () => {
            const books = [{ _id: VALID_ID, name: 'Libro de prueba' }];
            Book.aggregate.mockResolvedValue(books);
            const res = createResponse();

            await getAllBooks({}, res);

            expect(Book.aggregate).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        $lookup: expect.objectContaining({ from: 'authors' })
                    }),
                    expect.objectContaining({
                        $lookup: expect.objectContaining({ from: 'genres' })
                    })
                ])
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                booksList: books
            });
        });

        test('maneja un error al listar libros', async () => {
            Book.aggregate.mockRejectedValue(new Error('Database error'));
            const res = createResponse();

            await getAllBooks({}, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'No se pudieron consultar los libros'
            });
        });
    });

    describe('addBook', () => {
        test('TB-05: registra un libro correctamente y normaliza los campos', async () => {
            const book = { _id: VALID_ID, name: 'Nuevo libro' };
            Book.create.mockResolvedValue(book);
            const res = createResponse();

            await addBook({
                body: {
                    name: '  Nuevo libro  ',
                    isbn: ' 9781234567890 ',
                    summary: '  Resumen ',
                    photoUrl: ' https://example.com/book.jpg ',
                    isAvailable: true,
                    authorId: VALID_AUTHOR_ID,
                    genreId: VALID_GENRE_ID,
                    isAdmin: true
                }
            }, res);
            expect(Book.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Nuevo libro',
                    isbn: '9781234567890',
                    summary: 'Resumen',
                    photoUrl: 'https://example.com/book.jpg',
                    isAvailable: true,
                    authorId: expect.anything(),
                    genreId: expect.anything()
                })
            );

            const createdData = Book.create.mock.calls[0][0];
            expect(createdData.isAdmin).toBeUndefined();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                newBook: book
            });
        });

        test.each([
            ['cuerpo ausente', null],
            ['cuerpo de tipo texto', 'invalid'],
            ['cuerpo de tipo arreglo', []]
        ])('rechaza %s', async (description, body) => {
            const res = createResponse();

            await addBook({ body }, res);

            expect(Book.create).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Datos del libro no validos'
            });
        });

        test.each([
            [{ isbn: '9781234567890' }, 'El nombre del libro es obligatorio'],
            [{ name: '   ', isbn: '9781234567890' }, 'El nombre del libro es obligatorio'],
            [{ name: 'Libro' }, 'El ISBN es obligatorio'],
            [{ name: 'Libro', isbn: '   ' }, 'El ISBN es obligatorio']
        ])('rechaza campos obligatorios invalidos', async (body, message) => {
            const res = createResponse();

            await addBook({ body }, res);

            expect(Book.create).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message
            });
        });

        test('rechaza disponibilidad que no sea booleana', async () => {
            const res = createResponse();

            await addBook({
                body: { ...validBook, isAvailable: 'true' }
            }, res);

            expect(Book.create).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'isAvailable debe ser booleano'
            });
        });

        test.each(['authorId', 'genreId'])(
            'rechaza una referencia invalida en %s',
            async field => {
                const res = createResponse();

                await addBook({
                    body: { ...validBook, [field]: 'invalid-id' }
                }, res);

                expect(Book.create).not.toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith({
                    success: false,
                    message: `${field} no contiene un ID valido`
                });
            }
        );

        test('acepta referencias nulas', async () => {
            Book.create.mockResolvedValue({ ...validBook });
            const res = createResponse();

            await addBook({
                body: {
                    ...validBook,
                    authorId: null,
                    genreId: null
                }
            }, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(Book.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    authorId: null,
                    genreId: null
                })
            );
        });

        test.each(['summary', 'photoUrl'])(
            'rechaza %s cuando no es texto',
            async field => {
                const res = createResponse();

                await addBook({
                    body: { ...validBook, [field]: 123 }
                }, res);

                expect(Book.create).not.toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith({
                    success: false,
                    message: `${field} debe ser texto`
                });
            }
        );

        test('maneja un error al crear el libro', async () => {
            Book.create.mockRejectedValue(new Error('Create failed'));
            const res = createResponse();

            await addBook({ body: validBook }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'No se pudo registrar el libro'
            });
        });
    });

    describe('updateBook', () => {
        test('TB-07: actualiza un libro correctamente', async () => {
            const book = { _id: VALID_ID, name: 'Actualizado' };
            Book.findByIdAndUpdate.mockResolvedValue(book);
            const res = createResponse();

            await updateBook({
                params: { id: VALID_ID },
                body: { name: 'Actualizado' }
            }, res);

            expect(Book.findByIdAndUpdate).toHaveBeenCalledWith(
                VALID_ID,
                { $set: { name: 'Actualizado' } },
                { new: true, runValidators: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                updatedBook: book
            });
        });

        test('TB-08: rechaza una actualizacion con ID invalido', async () => {
            const res = createResponse();

            await updateBook({
                params: { id: '123' },
                body: { name: 'Actualizado' }
            }, res);

            expect(Book.findByIdAndUpdate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test.each([
            ['cuerpo ausente', null],
            ['cuerpo de tipo arreglo', []],
            ['sin campos permitidos', { isAdmin: true }]
        ])('rechaza una actualizacion %s', async (description, body) => {
            const res = createResponse();

            await updateBook({
                params: { id: VALID_ID },
                body
            }, res);

            expect(Book.findByIdAndUpdate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'No hay campos validos para actualizar'
            });
        });

        test('rechaza un nombre vacio', async () => {
            const res = createResponse();

            await updateBook({
                params: { id: VALID_ID },
                body: { name: '   ' }
            }, res);

            expect(Book.findByIdAndUpdate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'El nombre del libro es obligatorio'
            });
        });

        test('rechaza un ISBN vacio', async () => {
            const res = createResponse();

            await updateBook({
                params: { id: VALID_ID },
                body: { isbn: '   ' }
            }, res);

            expect(Book.findByIdAndUpdate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'El ISBN es obligatorio'
            });
        });

        test('rechaza disponibilidad no booleana', async () => {
            const res = createResponse();

            await updateBook({
                params: { id: VALID_ID },
                body: { isAvailable: 1 }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'isAvailable debe ser booleano'
            });
        });

        test('rechaza una referencia invalida', async () => {
            const res = createResponse();

            await updateBook({
                params: { id: VALID_ID },
                body: { authorId: 'bad-id' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'authorId no contiene un ID valido'
            });
        });

        test('rechaza un resumen que no sea texto', async () => {
            const res = createResponse();

            await updateBook({
                params: { id: VALID_ID },
                body: { summary: false }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'summary debe ser texto'
            });
        });

        test('responde 404 si no encuentra el libro', async () => {
            Book.findByIdAndUpdate.mockResolvedValue(null);
            const res = createResponse();

            await updateBook({
                params: { id: VALID_ID },
                body: { name: 'Actualizado' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Libro no encontrado'
            });
        });

        test('maneja un error al actualizar el libro', async () => {
            Book.findByIdAndUpdate.mockRejectedValue(new Error('Update failed'));
            const res = createResponse();

            await updateBook({
                params: { id: VALID_ID },
                body: { name: 'Actualizado' }
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'No se pudo actualizar el libro'
            });
        });
    });

    describe('deleteBook', () => {
        test('TB-09: elimina un libro correctamente', async () => {
            const book = { _id: VALID_ID, name: 'Eliminado' };
            Book.findByIdAndDelete.mockResolvedValue(book);
            const res = createResponse();

            await deleteBook({ params: { id: VALID_ID } }, res);

            expect(Book.findByIdAndDelete).toHaveBeenCalledWith(VALID_ID);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                deletedBook: book
            });
        });

        test('rechaza un ID invalido', async () => {
            const res = createResponse();

            await deleteBook({ params: { id: '123' } }, res);

            expect(Book.findByIdAndDelete).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('TB-10: responde 404 cuando el libro no existe', async () => {
            Book.findByIdAndDelete.mockResolvedValue(null);
            const res = createResponse();

            await deleteBook({ params: { id: VALID_ID } }, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Libro no encontrado'
            });
        });

        test('maneja un error al eliminar el libro', async () => {
            Book.findByIdAndDelete.mockRejectedValue(new Error('Delete failed'));
            const res = createResponse();

            await deleteBook({ params: { id: VALID_ID } }, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'No se pudo eliminar el libro'
            });
        });
    });
});
