const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const headTeacherSchema = new Schema({
    name: { type: String, required: true },
    surname: { type: String, required: true },
    status: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true, minlength: 8 },
    mobile: { type: Number, required: true, minlength: 6 },
    invoices: [{ type: String, required: false }],
    bankaccount: { type: Number, required: false, minlength: 26, maxlength: 26 },
    passwordResetToken: { type: String, required: false },
    passwordResetTokenExpiration: { type: Date, required: false },
    topics: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Topic' }],
    grades: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Grade' }]
});

module.exports = mongoose.model('HeadTeacher', headTeacherSchema);