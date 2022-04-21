const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const topicSchema = new Schema({
    topic: { type: String, required: true },
    lessonDate: { type: Date, required: true },
    creationDate: { type: Date, required: true },
    absentStudents: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Student' }],
    presentStudents: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Student' }],
    homework: { type: String, required: false },
    createdBy: { type: mongoose.Types.ObjectId, required: true, ref: 'Teacher' },
    updates: [{ type: Object, required: false }],
    group: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Group' }]
});


module.exports = mongoose.model('Topic', topicSchema);