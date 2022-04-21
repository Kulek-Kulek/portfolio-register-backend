const { v1: uuid } = require('uuid');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Topic = require('../models/topic');
const Teacher = require('../models/teacher');
const Student = require('../models/student');
const Group = require('../models/group');
const HeadTeacher = require('../models/headTeacher');



const getTopics = async (req, res, next) => {
    let topics;
    try {
        topics = await Topic.find();
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać listy tematów.', 500);
        return next(error);
    }
    if (!topics || topics.length === 0) {
        const error = new HttpError('Nie znalazłem żadnych tematów w bazie danych.', 404);
        return next(error);
    }
    res.json({ topics: topics.map(topic => topic.toObject({ getters: true })) });
}




// const getTopicsByStudent = async (req, res, next) => {
//     const studentId = req.params.id;

//     let studentWithTopics;

//     try {
//         studentWithTopics = await Student.findById(studentId).populate('topics');
//     } catch (err) {
//         const error = new HttpError('Nie udało mi się znaleźć ucznia o takim id.', 500);
//         return next(error);
//     }

//     // if(!studentWithTopics || studentWithTopics === 0)
// }


const createTopic = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { topic, homework, lessonDate, groupId, teacherId, presentStudents, absentStudents } = req.body;

    let presentStudentsList = [];
    try {
        let student;
        for (let id of presentStudents) {
            student = await Student.findById(id);
            presentStudentsList.push(student);
        }
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć ucznia o takim id.', 500);
        return next(error);
    }

    let absentStudentsList = [];
    try {
        let student;
        for (let id of absentStudents) {
            student = await Student.findById(id);
            absentStudentsList.push(student);
        }
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć ucznia o takim id.', 500);
        return next(error);
    }


    let topicCreator;
    try {
        topicCreator = await Teacher.findById(teacherId, '-status -password');
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć lektora o takim id.', 500);
        return next(error);
    }
    if (!topicCreator) {
        try {
            topicCreator = await HeadTeacher.findById(teacherId);
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć lektora o takim id.', 500);
            return next(error);
        }
    }
    if (!topicCreator) {
        const error = new HttpError('Nie udało mi się znaleźć takiego lektora!!!', 404);
        return next(error);
    }


    let topicGroup;
    try {
        topicGroup = await Group.findById(groupId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć grupy o takim id.', 500);
        return next(error);
    };

    if (!topicGroup) {
        const error = new HttpError('Nie udało mi się znaleźć takiej grupy!', 404);
        return next(error);
    }

    const students = presentStudentsList.concat(absentStudentsList);

    const createdTopic = new Topic({
        id: uuid(),
        topic,
        lessonDate,
        creationDate: new Date().toISOString(),
        absentStudents: absentStudentsList,
        presentStudents: presentStudentsList,
        homework,
        createdBy: topicCreator,
        updates: [],
        group: topicGroup,
        students
    });

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdTopic.save({ session: sess });
        topicCreator.topics.push(createdTopic);
        await topicCreator.save({ session: sess });
        topicGroup.topics.push(createdTopic);
        await topicGroup.save({ session: sess });
        for (let student of students) {
            student.topics.push(createdTopic);
            await student.save({ session: sess });
        }
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('Nie udało mi się stworzyć nowego tematu.', 500);
        return next(error);
    }

    let teacherWithGroups;
    try {
        teacherWithGroups = await Teacher.findById(teacherId, '-password -status ')
            .populate({ path: 'group', match: { archive: false }, populate: { path: 'group' } })
            .populate({ path: 'group', match: { archive: false }, populate: { path: 'topics' } })
            .populate({ path: 'group', match: { archive: false }, populate: { path: 'teacher', select: '-password -status' } })
            .populate({ path: 'group', match: { archive: false }, populate: { path: 'students', match: { archive: false }, select: '-password -status', populate: { path: 'grades' } } });
    } catch (err) {
        const error = new HttpError('Dodałem temat, ale nie udało mi się pobrać grup tego lektora.', 500);
        return next(error);
    }

    if (!teacherWithGroups || teacherWithGroups.length === 0) {
        const error = new HttpError('Dodałem temat, ale nie udało mi się znaleźć lektora o takim id i odświerzyć danych.', 500);
        return next(error);
    }

    res.json({ teacherWithGroups: teacherWithGroups.toObject({ getters: true }) });
}



const updateTopic = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { topicId } = req.params;
    const { topic, homework, lessonDate, updatePresentStudents, updateAbsentStudents, teacherId } = req.body;


    let updatedtopic;

    try {
        updatedtopic = await Topic.findById(topicId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tematu o takim id.', 500);
        return next(error);
    }

    if (!updatedtopic || updatedtopic.length === 0) {
        const error = new HttpError('Nie znalazłem takiego tematu w bazie danych.', 404);
        return next(error);
    }
    const updatingTeacher = {
        updatedBy: teacherId,
        updateDate: new Date().toISOString()
    }
    const updatedBy = updatedtopic.updates;
    updatedtopic.updates.unshift(updatingTeacher);

    updatedtopic.absentStudents = updateAbsentStudents;
    updatedtopic.presentStudents = updatePresentStudents;
    updatedtopic.topic = topic;
    updatedtopic.homework = homework;
    updatedtopic.lessonDate = new Date(lessonDate);
    updatedtopic.updates = updatedBy;


    try {
        await updatedtopic.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się zapisać w bazie danych poprawionego tematu.', 500);
        return next(error);
    }


    res.json({ message: 'Zaktualizowałem temat.', topic: updatedtopic.toObject({ getters: true }) });

}


const deleteTopic = async (req, res, next) => {
    const { topicId } = req.params;

    let topic;
    try {
        topic = await Topic.findById(topicId)
            .populate('group')
            .populate('createdBy')
            .populate('presentStudents')
            .populate('absentStudents')
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tego tematu, żeby go usunąć.', 500);
        return next(error);
    }
    if (!topic) {
        const error = new HttpError('Nie znalazłem tematu o takim id.', 404);
        return next(error);
    }

    let group;
    if (topic.group && topic.group[0]) {

        const groupId = topic.group[0]._id;

        try {
            group = await Group.findById(groupId);
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć tej grupy i jej tematu.', 500);
            return next(error);
        }
        if (!group) {
            const error = new HttpError('Nie znalazłem grupy o takim id.', 404);
            return next(error);
        }

        const updatedGroupTopics = group.topics.filter(topic => topic.toString() !== topicId.toString());

        group.topics = updatedGroupTopics;
    }


    const studentsList = topic.presentStudents.concat(topic.absentStudents);


    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await topic.remove({ session: sess });
        topic.createdBy.topics.pull(topic);
        await topic.createdBy.save({ session: sess });
        group && await group.save({ session: sess });

        let topicStudent;
        for (let student of studentsList) {
            let studentId = student._id;
            try {
                topicStudent = await Student.findById(studentId);
            } catch (err) {
                const error = new HttpError('Nie udało mi się znaleźć tego ucznia i jego tematu.', 500);
                return next(error);
            }
            if (!topicStudent) {
                const error = new HttpError('Nie znalazłem ucznia o takim id.', 404);
                return next(error);
            }
            const updatedStudentTopics = topicStudent.topics.filter(topic => topic.toString() !== topicId.toString());
            topicStudent.topics = updatedStudentTopics;
            await topicStudent.save({ session: sess });
        }

        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('Nie udało mi się usunąć tego tematu.', 500);
        return next(error);
    }



    res.status(200).json({ message: 'Temat usunięty z bazy danych.', topic });
};

exports.getTopics = getTopics;
// exports.getTopicsByStudent = getTopicsByStudent;
exports.createTopic = createTopic;
exports.updateTopic = updateTopic;
exports.deleteTopic = deleteTopic;