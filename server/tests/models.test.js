
const mongoose = require('mongoose');

const Author = require('../models/author');
const Book = require('../models/book');
const Borrowal = require('../models/borrowal');
const Genre = require('../models/genre');
const Member = require('../models/member');
const Review = require('../models/review');
const User = require('../models/user');

describe('Model schemas', () => {
    afterAll(async () => {
        await mongoose.disconnect();
    });

    test('Author requires a name', async () => {
        const author = new Author({});
        const error = author.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.name).toBeDefined();
    });

    test('Book requires name, isbn and isAvailable', async () => {
        const book = new Book({});
        const error = book.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.name).toBeDefined();
        expect(error.errors.isbn).toBeDefined();
        expect(error.errors.isAvailable).toBeDefined();
    });

    test('Book accepts valid required fields', () => {
        const book = new Book({
            name: 'Testing Book',
            isbn: '9781234567890',
            isAvailable: true
        });

        expect(book.validateSync()).toBeUndefined();
    });

    test('Genre requires a name', () => {
        const genre = new Genre({});
        const error = genre.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.name).toBeDefined();
    });

    test('Member requires its mandatory fields', () => {
        const member = new Member({});
        const error = member.validateSync();

        expect(error).toBeDefined();
    });

    test('Review requires bookID and star', () => {
        const review = new Review({});
        const error = review.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.bookID).toBeDefined();
        expect(error.errors.star).toBeDefined();
    });

    test('User requires its mandatory fields', () => {
        const user = new User({});
        const error = user.validateSync();

        expect(error).toBeDefined();
    });

    test('Borrowal validates its schema', () => {
        const borrowal = new Borrowal({});
        const error = borrowal.validateSync();

        expect(borrowal).toBeDefined();
        expect(error).toBeDefined();
    });
});
