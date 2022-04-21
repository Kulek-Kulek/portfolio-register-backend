const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const contactSchema = new Schema(
    {
        contactName: { type: String, required: true },
        contactMobile: { type: Number, required: true, minlength: 6 },
        contactEmail: { type: String, required: true },
        contactComment: { type: String, required: true },
    }
);


module.exports = mongoose.model('Contact', contactSchema);