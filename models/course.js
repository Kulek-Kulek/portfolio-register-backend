const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const courseSchema = new Schema(
    {
        courseType: { type: String, required: true },
        courseTitle: { type: String, required: true },
        coursePrice: { type: Number },
        courseDesc: { type: String, required: true },
        courseForWho: { type: String, required: true },
        courseAdvgs: { type: Array, required: true },
        courseTerms: { type: String, required: true }
    }
);


module.exports = mongoose.model('Course', courseSchema);