const { v1: uuid } = require('uuid');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Group = require('../models/group');
const Teacher = require('../models/teacher');
const Student = require('../models/student');
const Settings = require('../models/setting');




const getGroups = async (req, res, next) => {
    const archive = req.params.data;

    let groups;
    try {
        groups = await Group.find({ archive: archive })
            .populate({ path: 'students', populate: { path: 'students' } })
            .populate({ path: 'teacher', populate: { path: 'teacher' } });
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać listy grup.', 500);
        return next(error);
    }
    if (!groups || groups.length === 0) {
        const error = new HttpError('Nie masz żadnych grup w bazie danych.', 404);
        return next(error);
    }

    res.status(200).json({ groups: groups.map(group => group.toObject({ getters: true })) });
}


const getOneGroup = async (req, res, next) => {

    const groupId = req.params.groupId;

    let settings;
    try {
        settings = await Settings.find();
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać ustawień.', 500);
        return next(error);
    }

    if (!settings || settings.length === 0 || !settings[0].schoolYearSchedlue) {
        const error = new HttpError('Nie pobrałem ustawień aplikacji.', 404);
        return next(error);
    }

    const currentSchoolYearStart = settings[0].schoolYearSchedlue.schoolYearStart;
    const currentSchoolYearEnd = settings[0].schoolYearSchedlue.schoolYearEnd;


    const startDateDay = currentSchoolYearStart.getDate();
    const startDateMonth = currentSchoolYearStart.getMonth();
    const startDateYear = currentSchoolYearStart.getFullYear();

    const endDateDay = currentSchoolYearEnd.getDate();
    const endDateMonth = currentSchoolYearEnd.getMonth();
    const endDateYear = currentSchoolYearEnd.getFullYear();


    let group;
    try {
        group = await Group.findById(groupId)
            .populate({ path: 'topics', populate: { path: 'absentStudents', select: '-password -status' } })
            .populate({ path: 'topics', populate: { path: 'presentStudents', select: '-password -status' } })
            .populate({
                path: 'students', match: { archive: false }, select: '-password -status',
                populate: {
                    path: 'grades', match: { creationDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay), $lte: new Date(endDateYear, endDateMonth, endDateDay) } },
                    populate: { path: 'createdBy', select: '-password -status -passwordResetToken -passwordResetTokenExpiration' }
                }
            });
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać danych tej grupy.', 500);
        return next(error);
    }
    if (!group || group.length === 0) {
        const error = new HttpError('Nie znalazłem tej grupy w bazie danych.', 404);
        return next(error);
    }


    const students = [];

    for (let s of group.students) {
        const grades = s.endTermGrades.filter(g => new Date(g.creationDate).getTime() >= new Date(currentSchoolYearStart).getTime() && new Date(g.creationDate) <= new Date(currentSchoolYearEnd).getTime());
        s.endTermGrades = grades;
        students.push(s);
    }

    group.students = students;
    res.json({ group: group.toObject({ getters: true }) });
};


// const getGroupsByTeacher = async (req, res, next) => {
//     const teacherId = req.params.id;

//     let teacherWithGroups;
//     try {
//         teacherWithGroups = await Teacher.findById(teacherId).populate('groups');
//     } catch (err) {
//         const error = new HttpError('Nie udało mi się pobrać grup dla tego lektora.', 500);
//         return next(error);
//     }
//     if (!teacherWithGroups || teacherWithGroups.length === 0) {
//         const error = new HttpError('Nie udało mi się znaleźć lektora o takim id.', 500);
//         return next(error);
//     }

//     res.status(200).json({ groups: teacherWithGroups });
// }



const createGroup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError(`${errors && errors.errors && errors.errors[0] && typeof errors.errors[0].value === 'object' ? 'Wprowadziłeś niepoprawne dane. Pmiętaj zaznaczyć dni i godziny zajęć.' : 'Wprowadziłeś niepoprawne dane.'}`, 422));
    }

    const { name, lessonDayTime, lessonLength, courseLength, groupLevel, certificateType, schoolYear, courseName, courseBook } = req.body;


    let groupExists;
    try {
        groupExists = await Group.findOne({ name });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć takij grupy.', 500);
        return next(error);
    }

    if (groupExists) {
        const error = new HttpError('Grupa o takiej nazwie już istnieje.', 422);
        return next(error);
    }

    const createdGroup = new Group({
        id: uuid(),
        name,
        lessonDayTime,
        lessonLength,
        courseLength,
        pastTeacher: [],
        teacher: [],
        topics: [],
        students: [],
        grades: [],
        certificateType,
        groupLevel,
        archive: false,
        schoolYear,
        courseName,
        courseBook
    });

    try {
        await createdGroup.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się utworzyć nowej grupy.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'Dodałem grupę.', group: createdGroup.toObject({ getters: true }) });
}



const addToGroup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const groupId = req.params.id;

    const { studentId, teacherId } = req.body;

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć grupy o takim id.', 500);
        return next(error);
    }
    if (!group) {
        const error = new HttpError('Nie ma takiej grupy.', 404);
        return next(error);
    }


    for (let id of group.students) {
        if (id.toString() === studentId) {
            const error = new HttpError('Ten uczeń jest już w tej grupie.', 404);
            return next(error);
        }
    }
    for (let id of group.teacher) {
        if (id.toString() === teacherId) {
            const error = new HttpError('Ten lektor jest już w tej grupie.', 404);
            return next(error);
        }
    }

    let typeOfUpdatedData;
    let model;
    if (studentId) {
        model = Student.findById(studentId);
    } if (teacherId) {
        model = Teacher.findById(teacherId);
    }

    try {
        typeOfUpdatedData = await model;
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć modułu o takim id.', 500);
        return next(error);
    }

    if (!typeOfUpdatedData) {
        const error = new HttpError('Nie udało mi się znaleźć takiego ucznia lub lektora.', 404);
        return next(error);
    }

    if (teacherId) {
        const pastGroup = typeOfUpdatedData.pastGroup.filter(g => g.id === groupId);
        typeOfUpdatedData.pastGroup = pastGroup;
    }

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        studentId && group.students.push(typeOfUpdatedData);
        teacherId && group.teacher.push(typeOfUpdatedData);
        await group.save({ session: sess });
        let updatedGroup;
        try {
            updatedGroup = await Group.findById(groupId);
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć grupy o takim id po dodaniu ucznia.', 500);
            return next(error);
        }
        if (!updatedGroup) {
            const error = new HttpError('Nie udało mi się znaleźć takiej grupy po dodaniu go do niej ucznia.', 404);
            return next(error);
        }
        typeOfUpdatedData.group.push(updatedGroup);
        await typeOfUpdatedData.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('Nie udało mi się dodać tego ucznia do grupy.', 500);
        return next(error);
    }

    res.status(200).json({ group: group, typeOfUpdatedData: typeOfUpdatedData });
}


const updateGroup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        return next(new HttpError(`${errors && errors.errors && errors.errors[0] && typeof errors.errors[0].value === 'object' ? 'Wprowadziłeś niepoprawne dane. Pmiętaj zaznaczyć dni i godziny zajęć.' : 'Wprowadziłeś niepoprawne dane.'}`, 422));
    }

    const { name, lessonLength, courseLength, lessonDayTime, certificateType, groupLevel, archive, courseName, schoolYear, courseBook } = req.body;
    const groupId = req.params.groupId;


    let group;
    try {
        group = await Group.findById(groupId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tej grupy.', 500);
        return next(error);
    }

    if (!group || group.length === 0) {
        const error = new HttpError('Nie znalazłem tej grupy w bazie danych.', 404);
        return next(error);
    }



    group.name = name;
    group.courseLength = courseLength;
    group.lessonLength = lessonLength;
    group.lessonDayTime = lessonDayTime;
    group.groupLevel = groupLevel;
    group.certificateType = certificateType;
    group.archive = archive === undefined ? group.archive : archive;
    group.schoolYear = schoolYear;
    group.courseName = courseName;
    group.courseBook = courseBook ? courseBook : group.courseBook;

    try {
        await group.save();
    } catch (err) {
        console.log(err);
        const error = new HttpError('Nie udało mi się zapisać w bazie danych tej grupy.', 500);
        return next(error);
    }


    let response = { message: 'Zaktualizowałem dane tej grupy.', group: group.toObject({ getters: true }) };
    if (archive !== undefined) {
        let groups;
        try {
            groups = await Group.find({ archive: !archive })
                .populate({ path: 'students', match: { archive: false }, populate: { path: 'students' } })
                .populate({ path: 'teacher', match: { archive: false }, populate: { path: 'teacher' } });
        } catch (err) {
            const error = new HttpError('Nie udało mi się pobrać listy grup.', 500);
            return next(error);
        }
        if (!groups || groups.length === 0) {
            const error = new HttpError('Nie masz żadnych grup w bazie danych.', 404);
            return next(error);
        }
        response = { message: 'Przeniosłem grupę do archiwum', groups: groups.map(g => g.toObject({ getters: true })) }
    }

    res.json(response);
}


const deleteDataFromGroup = async (req, res, next) => {
    const groupId = req.params.id;
    const { studentId, teacherId } = req.body;

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tej grupy, żeby usunąć z niej ucznia.', 500);
        return next(error);
    }

    if (!group) {
        const error = new HttpError('Nie ma takiej grupy.', 404);
        return next(error);
    }

    const originalGroup = group;


    let student;
    if (studentId) {
        try {
            student = await Student.findById(studentId);
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć ucznia, żeby usunąć go z grupy.', 500);
            return next(error);
        }
        group.students = group.students.filter(student => student.toString() !== studentId);
        student.group = student.group.filter(group => group.toString() !== groupId);
    }

    let teacher;
    let originalTeacher;
    if (teacherId) {
        try {
            teacher = await Teacher.findById(teacherId);
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć lektora, żeby usunąć go z grupy.', 500);
            return next(error);
        }
        originalTeacher = teacher;


        group.teacher = group.teacher.filter(t => t.toString() !== teacherId);
        teacher.group = teacher.group.filter(g => g.toString() !== groupId);
    }


    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        teacherId && group.pastTeacher.push(originalTeacher);
        await group.save({ session: sess });
        teacherId && teacher.pastGroup.push(originalGroup);
        studentId && await student.save({ session: sess });
        teacherId && await teacher.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('Nie udało mi się usunąć danych z tej grupy.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'Zaaktualizowałem dane grupy.', group: group.toObject({ getters: true }) });
};



const deleteGroup = async (req, res, next) => {
    const groupId = req.params.id;
    let group;
    try {
        group = await Group.findById(groupId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tej grupy, żeby ją usunąć.', 500);
        return next(error);
    }

    try {
        await group.remove();
    } catch (err) {
        const error = new HttpError('Nie udało mi się usunąć tej grupy.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'Grupa usunięta z bazy danych.' });
};



const recreateGroup = async (req, res, next) => {

    const groupId = req.params.groupId;

    let group;

    try {
        group = await Group.findById(groupId)
            .populate('teacher')
            .populate('students');
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tej grupy.', 500);
        return next(error);
    }

    if (!group || group.length === 0) {
        const error = new HttpError('Nie znalazłem tej grupy w bazie danych.', 404);
        return next(error);
    }



    const createdGroup = new Group({
        id: uuid(),
        name: group.name + ' ' + new Date().toLocaleDateString(),
        lessonDayTime: group.lessonDayTime,
        lessonLength: group.lessonLength,
        courseLength: group.courseLength,
        pastTeacher: [],
        teacher: [],
        topics: [],
        students: [],
        grades: [],
        certificateType: group.certificateType || null,
        groupLevel: group.groupLevel || null,
        archive: false,
        schoolYear: group.schoolYear,
        courseName: group.courseName
    });

    const name = createdGroup.name;


    let groupExists;
    try {
        groupExists = await Group.findOne({ name });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć takij grupy.', 500);
        return next(error);
    }

    if (groupExists) {
        const error = new HttpError('Grupa o takiej nazwie już istnieje.', 422);
        return next(error);
    }

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        for (let teacher of group.teacher) {
            createdGroup.teacher.push(teacher);
            await createdGroup.save({ session: sess });
            teacher.group.push(createdGroup);
            await teacher.save({ session: sess });
        }
        for (let student of group.students) {
            createdGroup.students.push(student);
            await createdGroup.save({ session: sess });
            student.group.push(createdGroup);
            await student.save({ session: sess });
        }
        await sess.commitTransaction();
    } catch (err) {
        console.log(err);
        const error = new HttpError('Nie udało mi się odtworzyć tej grupy.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'Dodałem grupę.', group: createdGroup.toObject({ getters: true }) });
};




exports.getGroups = getGroups;
exports.getOneGroup = getOneGroup;
exports.createGroup = createGroup;
exports.addToGroup = addToGroup;
exports.updateGroup = updateGroup;
exports.deleteGroup = deleteGroup;
exports.deleteDataFromGroup = deleteDataFromGroup;
exports.recreateGroup = recreateGroup;


