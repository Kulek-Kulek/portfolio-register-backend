const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const payWithPrzelewy24PaymentSchema = new Schema({
    paymentData: { type: Object, required: true },
    paymantDate: { type: Date, required: true },
    student: { type: mongoose.Types.ObjectId, required: true, ref: 'Student' }
});


module.exports = mongoose.model('PayWithPrzelewy24Payment', payWithPrzelewy24PaymentSchema);