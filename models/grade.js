const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gradeSchema = new Schema({
    grades: { type: Array, required: true },
    creationDate: { type: Date, required: true },
    createdBy: { type: mongoose.Types.ObjectId, required: true, ref: ('Teacher') },
    group: [{ type: mongoose.Types.ObjectId, required: true, ref: ('Group') }]
});


module.exports = mongoose.model('Grade', gradeSchema);