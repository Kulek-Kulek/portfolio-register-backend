const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const orderSchema = new Schema(
    {
        name: { type: String, required: true },
        surname: { type: String, required: true },
        comments: { type: String, required: false },
        lessonType: { type: String, required: true },
        mobile: { type: Number, required: true },
        birthday: { type: String, required: true },
        email: { type: String, required: true },
        courseRules: { type: Boolean, required: true },
        marketingRules: { type: Boolean, required: false },
        unavailable: { type: Array, required: false },
        coursePrice: { type: String || Number, required: true },
        courseName: { type: String, required: true },
        submissionDate: { type: String, required: true },
        submissionTime: { type: String, required: true }
    }
);


module.exports = mongoose.model('Order', orderSchema);