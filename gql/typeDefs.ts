import { gql } from "apollo-server";


export const typeDefs = gql`

type UserBook {
    book:Book!
    status:String!
    _id:ID!
}

type User {
    _id:ID
    email:String
    books:[UserBook!]
}


input UserLoginInput {
    email:String!
    password:String!
}

type Author {
    _id:ID!
    name:String!
    books:[Book!]!
}

type Book {
    _id:ID
    title:String
    isbn:String
    authors:[Author!]
    pages:Int
    description:String
    imgUrl:String
}

type BookPayload {
    book:Book
    errors:[Error!]
}

type UserPayload {
    user: User
    errors:[Error!]
    token:String
}
type Error {
    message:String!
}

type AuthorPayload {
    author:Author
    errors:[Error!]
}


enum Category {
    title
    isbn
    author
}

type BooksPayload {
    books:[Book]
    errors:[Error!]
}

type AuthorsPayload {
    authors:[Author]
    errors:[Error!]

}


union SearchResult = BooksPayload | AuthorsPayload | Error

type EmailPayload {
    errors:[Error!]
    message:String
    email:String
}

type PasswordPayload {
    errors:[Error!]
    message:String
}

type MessagePayload {
    errors:[Error!]
    message:String
    userBooks:[UserBook]
}

type Query {
    search(data:String!,category:Category!):SearchResult
    getBook(bookId:ID!):BookPayload
    getBooks:BooksPayload
    getUser(userId:ID!,bookFilter:String):UserPayload
    getAuthor(authorId:ID!):AuthorPayload
}

type Mutation{
    userCreate(email:String!,password:String!):UserPayload
    userLogin(email:String!,password:String!):UserPayload
    bookAdd(title:String!,isbn:String!,authors:[String!]!,pages:Int!,description:String!,imgUrl:String!):BookPayload
    changeEmail(email:String!,emailConfirm:String!,_id:ID):EmailPayload
    changePassword(password:String!,passwordConfirm:String!,_id:ID):PasswordPayload
    addToCollection(bookId:ID!,userId:ID!,bookStatus:String!):MessagePayload
    changeBookStatus(bookId:ID!,userId:ID!,newStatus:String!):MessagePayload
    removeFromCollection(bookId:ID!,userId:ID!):MessagePayload

}
`