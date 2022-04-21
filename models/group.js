const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
    name: { type: String, required: true },
    lessonDayTime: [{ type: Object, required: true }],
    lessonLength: { type: Number, required: true },
    courseLength: { type: Number, required: true },
    groupLevel: { type: String, required: true },
    certificateType: { type: String, required: true },
    teacher: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Teacher' }],
    pastTeacher: [{ type: mongoose.Types.ObjectId, required: false, ref: 'Teacher' }],
    topics: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Topic' }],
    grades: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Grade' }],
    students: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Student' }],
    archive: { type: Boolean, required: true },
    schoolYear: { type: String, required: true },
    courseName: { type: String, required: true },
    courseBook: { type: String, required: false }
});

module.exports = mongoose.model('Group', groupSchema);