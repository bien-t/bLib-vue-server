import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
    email: {
            type: String, 
            trim: true,
            required: [true,'Email address is required'],
            unique:true,
            match: [/.+@.+\..+/, 'Please enter a valid email address'],
            maxlength: 64,

    },
    books: [{
        bookId: {
            type:mongoose.Schema.Types.ObjectId,
            ref: 'Book',
        },
        status: {
            type:String,
            enum: ['Completed', 'Plan to read', 'Reading'],
        }
    
    },
    ]
})

export default mongoose.model('User', UserSchema)