import { Models } from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import getErrorMessage from '../dbError'

interface ErrorArray {
    message: string
}

interface Payload {
    [key: string]: {}
    errors: ErrorArray[]
}
const TOKEN_KEY = process.env.TOKEN_KEY as string;

export const resolvers = {
    Book: {
        async authors(parent: any, args: any, { models }: { models: Models }) {
            return await models.Author.find({ '_id': { $in: parent.authors } });
        }
    },
    Author: {
        async books(parent: any, args: any, { models }: { models: Models }) {
            return await models.Book.find({ '_id': { $in: parent.books } });
        }
    },
    UserBook: {
        async book(parent: any, args: any, { models }: { models: Models }) {
            return await models.Book.findById(parent.bookId);
        }
    },

    SearchResult: {
        __resolveType(obj: any) {
            if (obj?.errors?.length > 0 || obj?.authors?.length === 0 || obj?.books?.length === 0) {
                return 'Error';
            }
            
            if (obj?.books?.length > 0) {
                return 'BooksPayload';
            }

            if (obj?.authors?.length > 0) {
                return 'AuthorsPayload';
            }
        }
    },
    Mutation: {
        async userCreate(parent: any, args: { email: string, password: string }, { models }: { models: Models }) {
            const payload: Payload = { user: {}, errors: [] };
            if (!args.email || !args.password) {
                payload.errors.push({
                    message: 'Invalid email or password'
                });
            }

            if (args.password.length < 6) {
                payload.errors.push({
                    message: 'Password is too short'
                });
            }

            if (payload.errors.length === 0) {
                args.email = args.email.trim().toLowerCase();
                const hashedPassword = await bcrypt.hash(args.password, 10);
                try {
                    const user = new models.User({ email: args.email });
                    const password = new models.Password({ user: user._id, hashedPassword });
                    await user.save();
                    await password.save();
                    payload.user = user;
                    const getToken = jwt.sign(user._id.toString(), TOKEN_KEY);
                    payload.token = getToken;
                } catch (err) {
                    payload.errors.push({ message: getErrorMessage(err) });
                }
            }
            return payload;
        },
        async userLogin(parent: any, args: { email: string, password: string }, { models }: { models: Models }) {
            const payload: Payload = { user: {}, errors: [] };
            if (!args.email || !args.password) {
                payload.errors.push({
                    message: 'Invalid email or password'
                });
            }

            if (payload.errors.length === 0) {
                args.email = args.email.trim().toLowerCase();
                const user = await models.User.findOne(({ email: args.email }));
                if (!user) {
                    payload.errors.push({ message: `Email and password don't match` });
                    return payload;
                }
                const password = await models.Password.findOne({ user: user._id });
                const validatePassword = await bcrypt.compare(args.password, password.hashedPassword);
                if (!validatePassword) {
                    payload.errors.push({ message: `Email and password don't match` });
                    return payload;
                }
                payload.user = user;
                const getToken = jwt.sign(user._id.toString(), TOKEN_KEY);
                payload.token = getToken;
            }
            return payload
        },
        async bookAdd(parent: any, args: { title: string, isbn: string, pages: number, authors: string[], description: string, imgUrl: string }, { models, token }: { models: Models, token: string }) {

            const payload: Payload = { book: {}, errors: [] };
            jwt.verify(token, TOKEN_KEY, (err) => {
                if (err) {
                    payload.errors.push({ message: 'Authentication failed' });
                }
            });
            if (payload.errors.length === 0) {
                const book = new models.Book({
                    title: args.title,
                    isbn: args.isbn,
                    pages: args.pages,
                    description: args.description,
                    imgUrl: args.imgUrl
                });

                const findAuthors = await models.Author.find({ 'name': { $in: args.authors } });
                const mapAuthorsName = findAuthors.map(author => author.name.toString());
                const filteredAuthorsName = args.authors.filter(name => !mapAuthorsName.includes(name));
                const authorsArray = filteredAuthorsName.map((element) => {
                    return { name: element };
                });
                const authors = [...await models.Author.insertMany(authorsArray), ...findAuthors];
                const authorsId = authors.map(author => author._id);
                book.authors = authorsId;
                await book.save();
                for (let index = 0; index < authorsId.length; index++) {
                    await models.Author.findByIdAndUpdate(authorsId[index], {
                        $push: {
                            books: book._id
                        }
                    })

                }
                payload.book = book;

            }
            return payload;
        },
        async changeEmail(parent: any, args: { email: string, emailConfirm: string, _id: string }, { models, token }: { models: Models, token: string }) {
            const payload: Payload = { message: '', errors: [] };

            jwt.verify(token, TOKEN_KEY, (err) => {
                if (err) {
                    payload.errors.push({ message: 'Authentication failed' })
                }
            });
            if (!args.email || !args.emailConfirm) {
                payload.errors.push({
                    message: 'Invalid email'
                });
            }
            if (args.email !== args.emailConfirm) {
                payload.errors.push({
                    message: 'Emails are different'
                });
            }
            if (payload.errors.length === 0) {
                const user = await models.User.findOne({ 'email': { $in: args.email.trim() } });
                if (user) {
                    payload.errors.push({
                        message: 'Email is already taken'
                    })
                } else {
                    await models.User.findByIdAndUpdate(args._id, { email: args.email.trim() });
                    payload.message = 'Email has been changed';
                    payload.email = args.email;
                }
            }

            return payload;
        },
        async changePassword(parent: any, args: { password: string, passwordConfirm: string, _id: string }, { models, token }: { models: Models, token: string }) {
            const payload: Payload = { message: '', errors: [] };
            jwt.verify(token, TOKEN_KEY, (err) => {
                if (err) {
                    payload.errors.push({ message: 'Authentication failed' })
                }
            });
            if (!args.password || !args.password) {
                payload.errors.push({
                    message: 'Invalid password'
                });
            }
            if (args.password.length < 6) {
                payload.errors.push({
                    message: 'Password is too short'
                });
            }
            if (args.password !== args.passwordConfirm) {
                payload.errors.push({
                    message: "'Passwords don't match'"
                });
            }

            if (payload.errors.length === 0) {
                const hashedPassword = await bcrypt.hash(args.password, 10);
                await models.Password.findOneAndUpdate({ user: args._id }, { hashedPassword: hashedPassword });
                payload.message = 'Password has been updated';
            }
            return payload;
        },
        async addToCollection(parent: any, args: { bookId: string, userId: string, bookStatus: string }, { models, token }: { models: Models, token: string }) {
            const payload: Payload = { message: '', errors: [], userBooks: [] };

            jwt.verify(token, TOKEN_KEY, (err) => {
                if (err) {
                    payload.errors.push({ message: 'Authentication failed' });
                }
            });
            if (payload.errors.length === 0) {

                const user = await models.User.findByIdAndUpdate(args.userId, {
                    $push: {
                        books: {
                            bookId: args.bookId,
                            status: args.bookStatus
                        }
                    }
                }, { runValidators: true, new: true });

                payload.message = 'Book has been added to your collection';
                payload.userBooks = user.books;
            }
            return payload;
        },
        async changeBookStatus(parent: any, args: { bookId: string, userId: string, newStatus: string }, { models, token }: { models: Models, token: string }) {
            const payload: Payload = { message: '', errors: [], userBooks: [] };

            jwt.verify(token, TOKEN_KEY, (err) => {
                if (err) {
                    payload.errors.push({ message: 'Authentication failed' })
                }
            });

            if (payload.errors.length === 0) {
                const user = await models.User.findOneAndUpdate({ _id: args.userId },
                    { $set: { "books.$[element].status": args.newStatus } },
                    { arrayFilters: [{ "element.bookId": args.bookId }], runValidators: true, new: true });
                payload.userBooks = user.books.filter((book: any) => book.bookId.valueOf() === args.bookId);
                payload.message = 'Status changed';
            }
            return payload;
        },
        async removeFromCollection(parent: any, args: { bookId: string, userId: string }, { models, token }: { models: Models, token: string }) {
            const payload: Payload = { message: '', errors: [] };

            jwt.verify(token, TOKEN_KEY, (err) => {
                if (err) {
                    payload.errors.push({ message: 'Authentication failed' });
                }
            });

            if (payload.errors.length === 0) {
                await models.User.findByIdAndUpdate(args.userId, {
                    $pull: {
                        books: {
                            bookId: args.bookId
                        }
                    }
                })
                payload.message = 'Book has been deleted';
            }
            return payload;
        },
    },
    Query: {
        async getBook(parent: any, args: { bookId: string }, { models, token }: { models: Models, token: string }) {

            const payload: Payload = { book: {}, errors: [] };
            jwt.verify(token, TOKEN_KEY, (err) => {
                if (err) {
                    payload.errors.push({ message: 'Authentication failed' });
                }
            });
            if (payload.errors.length === 0) {
                const book = await models.Book.findById(args.bookId);
                payload.book = book;

            }
            return payload;
        },
        async getUser(parent: any, args: { userId: string, bookFilter: string }, { models, token }: { models: Models, token: string }) {
            const payload: Payload = { user: {}, errors: [] };
            jwt.verify(token, TOKEN_KEY, (err) => {
                if (err) {
                    payload.errors.push({ message: 'Authentication failed' });
                }
            });
            if (payload.errors.length === 0) {
                const user = await models.User.findById(args.userId);
                if (args.bookFilter === 'All' || args.bookFilter === undefined) {
                    payload.user = user;

                } else {
                    user.books = user.books.filter((book: { status: string }) => book.status === args.bookFilter);
                    payload.user = user;

                }
            }
            return payload
        },
        async search(parent: any, args: { data: string, category: string }, { models, token }: { models: Models, token: string }) {
            const payload: Payload = { errors: [] };

            jwt.verify(token, TOKEN_KEY, (err) => {
                if (err) {
                    payload.errors.push({ message: 'Authentication failed' });
                }
            });
            if (payload.errors.length === 0) {

                switch (args.category) {
                    case 'title': payload.books = await models.Book.find({ 'title': new RegExp(`${args.data}`, 'i') }); break;
                    case 'isbn': payload.books = await models.Book.find({ 'isbn': args.data }); break;
                    case 'author': payload.authors = await models.Author.find({ 'name': new RegExp(`${args.data}`, 'i') }); break;
                }
            }
            return payload;
        },
        async getBooks(parent: any, args: any, { models, token }: { models: Models, token: string }) {
            const payload: Payload = { books: {}, errors: [] };
            jwt.verify(token, TOKEN_KEY, (err) => {
                if (err) {
                    payload.errors.push({ message: 'Authentication failed' });
                }
            });
            if (payload.errors.length === 0) {
                payload.books = await models.Book.find({})
            }
            return payload;
        },
        async getAuthor(parent: any, args: { authorId: string }, { models, token }: { models: Models, token: string }) {
            const payload: Payload = { author: {}, errors: [] };
            jwt.verify(token, TOKEN_KEY, (err) => {
                if (err) {
                    payload.errors.push({ message: 'Authentication failed' });
                }
            });
            if (payload.errors.length === 0) {
                const author = await models.Author.findById(args.authorId)
                payload.author = author
            }
            return payload
        }

    }

}