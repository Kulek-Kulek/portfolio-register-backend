const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentsSchema = new Schema({
    name: { type: String, required: true },
    bankaccount: { type: String, required: true }
});


module.exports = mongoose.model('Payments', paymentsSchema);