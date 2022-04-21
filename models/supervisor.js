const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const supervisorSchema = new Schema({
    name: { type: String, required: false },
    surname: { type: String, required: false },
    email: { type: String, required: false },
    status: { type: String, required: false },
    passwordResetToken: { type: String, required: false },
    passwordResetTokenExpiration: { type: Date, required: false },
    password: { type: String, required: false, minlength: 8 },
    mobile: { type: Number, required: false, minlength: 6 },
    przelewy24Payments: [{ type: mongoose.Types.ObjectId, required: false, ref: 'PayWithPrzelewy24Payment' }],
    rodoConsents: [{ type: Object, required: false }],
    internalMessages: [{ type: Object, required: false }],
    supervisedStudents: [{ type: mongoose.Types.ObjectId, required: false, ref: 'Student' }]
});


module.exports = mongoose.model('Supervisor', supervisorSchema);