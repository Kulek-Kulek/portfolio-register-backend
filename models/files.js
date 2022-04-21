const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const filesSchema = new Schema(
    {
        path: { type: String, required: true },
        originalname: { type: String, required: true },
        key: { type: String, required: true },
        bucket: { type: String, required: true },
        type: { type: String, required: true }
    }
);


module.exports = mongoose.model('Files', filesSchema);