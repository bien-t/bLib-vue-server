import mongoose from 'mongoose';

const BookSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        maxlength: 64,
        required:true
    },
    isbn: {
        type: String,
        required: true,
        unique: true,
        trim: true,

    },
    authors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Author',
    }],
    pages: {
        type: Number,
        required: true,
    },
    description:{
        type:String,
        maxlength:2500
    },
    imgUrl:{
        type:String,
        required:true,
        maxlength:2500
    }
})


export default mongoose.model('Book', BookSchema)