const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentSchema = new Schema({
    name: { type: String, required: true },
    surname: { type: String, required: true },
    email: { type: String, required: true },
    status: { type: String, required: true },
    passwordResetToken: { type: String, required: false },
    passwordResetTokenExpiration: { type: Date, required: false },
    supervisorPasswordResetToken: { type: String, required: false },
    supervisorPasswordResetTokenExpiration: { type: Date, required: false },
    password: { type: String, required: true, minlength: 8 },
    birthday: { type: String, required: false },
    birthplace: { type: String, required: false },
    address: { type: Object, required: false },
    invoiceData: { type: Object, required: false },
    invoices: [{ type: Object, required: false }],
    financialRates: [{ type: Object, required: false }],
    documents: [{ type: Object, required: false }],
    mobile: { type: Number, required: true, minlength: 6 },
    group: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Group' }],
    topics: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Topic' }],
    courses: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Course' }],
    grades: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Grade' }],
    endTermGrades: [{ type: Object, required: false }],
    przelewy24Payments: [{ type: mongoose.Types.ObjectId, required: false, ref: 'PayWithPrzelewy24Payment' }],
    rodoConsents: [{ type: Object, required: false }],
    internalMessages: [{ type: Object, required: false }],
    profileImage: { type: Object, required: false },
    supervisors: [{ type: Object, required: false }],
    archive: { type: Boolean, required: true }
});


module.exports = mongoose.model('Student', studentSchema);