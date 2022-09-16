import mongoose from 'mongoose'

const AuthorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true,'Author is required'],
        trim: true,
        maxlength: 64,

    },
    books: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
    },
    ]
})

export default mongoose.model('Author', AuthorSchema)