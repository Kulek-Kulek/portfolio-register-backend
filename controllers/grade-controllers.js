const { v1: uuid } = require('uuid');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Grade = require('../models/grade');
const Teacher = require('../models/teacher');
const Group = require('../models/group');
const HeadTeacher = require('../models/headTeacher');
// const grade = require('../models/grade');


// const getGrades = async (req, res, next) => {
//     let topics;
//     try {
//         topics = await Topic.find();
//     } catch (err) {
//         const error = new HttpError('Nie udało mi się pobrać listy tematów.', 500);
//         return next(error);
//     }
//     res.json({ topics: topics.map(topic => topic.toObject({ getters: true })) });
// }




// const getGradeByStudent = async (req, res, next) => {
//     const {gradeId,studentId} = req.params;

//     let studentWithGrades;

//     try {
//         studentWithGrades = await Grade.findById(gradeId);
//     } catch (err) {
//         const error = new HttpError('Nie udało mi się znaleźć oceny o takim id.', 500);
//         return next(error);
//     }

//     if (!studentWithGrades || studentWithGrades.length === 0) {
//         const error = new HttpError('Nie znalazłem takiej oceny w bazie danych.', 404);
//         return next(error);
//     }

//     let studentGrade;

//     for (let grade of studentWithGrades.grades) {
//         if (grade.studentId === studentId) {
//             studentGrade = grade
//         }
//     }
//     res.status(200).json({ grade: studentGrade });
// }


const createGrade = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { grades, groupId, teacherId } = req.body;
    let createdBy;
    try {
        createdBy = await Teacher.findById(teacherId, '-status -password');
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć lektora o takim id.', 500);
        return next(error);
    }
    if (!createdBy || createdBy.length === 0) {
        try {
            createdBy = await HeadTeacher.findById(teacherId, '-status -password');
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć lektora o takim id.', 500);
            return next(error);
        }
    }

    if (!createdBy || createdBy.length === 0) {
        const error = new HttpError('Nie znalazłem tego lektora w bazie danych.', 404);
        return next(error);
    }

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć grupy o takim id.', 500);
        return next(error);
    };

    if (!group) {
        const error = new HttpError('Nie udało mi się znaleźć takiej grupy!', 404);
        return next(error);
    }

    let studentsInGroup;
    try {
        studentsInGroup = await Group.findById(groupId)
            .populate({ path: 'students', match: { archive: false }, select: '-password -status', });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć grupy o takim id.', 500);
        return next(error);
    };


    const createdGrade = new Grade({
        id: uuid(),
        grades,
        creationDate: new Date().toISOString(),
        createdBy,
        group
    });

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdGrade.save({ session: sess });
        createdBy.grades.push(createdGrade);
        await createdBy.save({ session: sess });
        group.grades.push(createdGrade);
        await group.save({ session: sess });
        for (let student of studentsInGroup.students) {
            student.grades.push(createdGrade);
            await student.save({ session: sess });
        }
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('Nie udało mi się stworzyć tej oceny.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'Dodałem nową ocenę.', grade: createdGrade.toObject({ getters: true }) });
}

const updateGrade = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { gradeId, studentId } = req.params;
    const updatedGrade = req.body.updatedGrade;


    let grades;

    try {
        grades = await Grade.findById(gradeId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć oceny o takim id.', 500);
        return next(error);
    }

    if (!grades || grades.length === 0) {
        const error = new HttpError('Nie znalazłem takiej oceny w bazie danych.', 404);
        return next(error);
    }


    let updatedStudentGrade;

    for (let grade of grades.grades) {
        if (grade.studentId === studentId) {
            if (!grade.grade) {
                grade.grade = updatedGrade;
                updatedStudentGrade = grade;
                const index = grades.grades.findIndex(sg => sg.studentId === studentId);
                grades.grades.splice(index, 1, updatedStudentGrade);
            } else {
                grade.updatedGrade = updatedGrade;
                updatedStudentGrade = grade;
                const index = grades.grades.findIndex(sg => sg.studentId === studentId);
                grades.grades.splice(index, 1, updatedStudentGrade);
            }
        }
    }

    try {
        await grades.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się zapisać w bazie danych poprawionej oceny.', 500);
        return next(error);
    }

    res.json({ message: 'Zaktualizowałem ocenę ucznia.', grades: grades.toObject({ getters: true }) });
}

const deleteGrade = async (req, res, next) => {
    const topicId = req.params.id;

    let topic;
    try {
        topic = await Topic.findById(topicId).populate('teacher');
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tego lektora, żeby go usunąć', 500);
        return next(error);
    }
    if (!topic) {
        const error = new HttpError('Nie znalazłem tematu o takim id.', 404);
        return next(error);
    }

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await topic.remove({ session: sess });
        topic.teacher.topics.pull(topic);
        await topic.teacher.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('Nie udało mi się usunąć tej oceny.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'Temat usunięty z bazy danych.' });
};

// exports.getTopics = getTopics;
exports.updateGrade = updateGrade;
exports.createGrade = createGrade;
exports.deleteGrade = deleteGrade;