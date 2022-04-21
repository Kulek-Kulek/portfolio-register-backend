const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const teacherSchema = new Schema({
    name: { type: String, required: true },
    surname: { type: String, required: true },
    email: { type: String, required: true },
    status: { type: String, required: true },
    password: { type: String, required: true, minlength: 8 },
    bankaccount: { type: Number, required: false, minlength: 26, maxlength: 26 },
    invoices: [{ type: Object, required: false }],
    passwordResetToken: { type: String, required: false },
    passwordResetTokenExpiration: { type: Date, required: false },
    zoom: { type: Object, required: false },
    mobile: { type: Number, required: true, minlength: 6 },
    group: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Group' }],
    pastGroup: [{ type: mongoose.Types.ObjectId, required: false, ref: 'Group' }],
    topics: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Topic' }],
    grades: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Grade' }],
    internalMessages: [{ type: Object, required: false }],
    profileImage: { type: Object, required: false },
    archive: { type: Boolean, required: true },
    bankaccount: { type: String, required: false }
});


module.exports = mongoose.model('Teacher', teacherSchema);