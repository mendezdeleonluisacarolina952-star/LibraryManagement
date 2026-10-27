const mongoose = require('mongoose')
const memberSchema = new mongoose.Schema({
    memberName: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: false
    },
    occupation: {
        type: String,
        required: false
    },
    nic: {
        type: Number,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },
    photoUrl: {
        type: String,
        required: false
    }
})

module.exports = mongoose.model('Member', memberSchema)
