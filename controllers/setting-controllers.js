const { v1: uuid } = require('uuid');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Setting = require('../models/setting');
const Student = require('../models/student');
const Teacher = require('../models/teacher');


const getSettings = async (req, res, next) => {

    let settings;
    try {
        settings = await Setting.find();
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać listy ustawień.', 500);
        return next(error);
    }

    if (!settings || settings.length === 0) {
        const error = new HttpError('Nie znalazłem żadnej listy z ustawieniami tej aplikacji.', 404);
        return next(error);
    }

    res.json({ settings: settings.map(set => set.toObject({ getters: true })) });
}

const setSchoolYearSchedlue = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { schoolYearStart, firstTermEnd, schoolYearEnd } = req.body;

    let settings;
    try {
        settings = await Setting.findOne();
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć ustawień.', 500);
        return next(error);
    }

    const schoolYearSchedlue = {
        schoolYearStart,
        firstTermEnd,
        schoolYearEnd
    };

    if (!settings) {
        settings = new Setting({
            schoolYearSchedlue: schoolYearSchedlue
        });
    } else if (settings) {
        settings.schoolYearSchedlue = schoolYearSchedlue;
    }

    try {
        await settings.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się utworzyć charmonogramu roku szkolnego.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'sukces', settings });
}


exports.setSchoolYearSchedlue = setSchoolYearSchedlue;



const setBankAccount = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { setBankAccount, setGracePeriod } = req.body;

    let settings;
    try {
        settings = await Setting.findOne();
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć ustawień.', 500);
        return next(error);
    }

    if (!settings) {
        settings = new Setting({
            bankAccount: setBankAccount && setBankAccount,
            gracePeriod: setGracePeriod && setGracePeriod
        });
    } if (settings && setBankAccount) {
        settings.bankAccount = setBankAccount.toString();
    } if (settings && setGracePeriod) {
        settings.gracePeriod = setGracePeriod.toString();
    } if (settings && setGracePeriod && setBankAccount) {
        settings.gracePeriod = setGracePeriod.toString();
        settings.bankAccount = setBankAccount.toString();
    }


    try {
        await settings.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się utworzyć rachunku bankowego.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'sukces', settings });
}



const setRodo = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { rodoName, rodoText, rodoDate, studentId, rodoId } = req.body;

    let settings;
    try {
        settings = await Setting.findOne();
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć ustawień.', 500);
        return next(error);
    }

    let student;
    if (studentId) {
        try {
            student = await Student.findById(studentId, '-status -password');
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć tego ucznia.', 500);
            return next(error);
        }
        if (!student || student.length === 0) {
            const error = new HttpError('Nie znalazłem tego ucznia w bazie danych, by zaaktualizować ustawienia aplikacji.', 404);
            return next(error);
        }
    }


    const rodo = {
        id: uuid(),
        rodoName,
        rodoText,
        rodoDate,
        students: []
    }

    if (!settings) {
        settings = new Setting({
            rodo: [rodo]
        });
    } else if (settings) {
        const updatedRodo = settings.rodo;
        if (student && rodoId) {
            for (let singleRodo of updatedRodo) {
                if (singleRodo.id === rodoId) {
                    singleRodo.students.push(
                        {
                            id: uuid(),
                            agreedOn: new Date().toISOString(),
                            studentId: student.id,
                            name: student.name,
                            surname: student.surname,
                            email: student.email,
                            mobile: student.mobile,
                            rodoStatus: 'accepted'
                        }
                    );
                    const index = updatedRodo.findIndex(doc => doc.id === rodoId);
                    updatedRodo.splice(index, 1, singleRodo);

                    student.rodoConsents.push(singleRodo);
                }
            }
        } else {
            updatedRodo.unshift(rodo);
        }
        settings.rodo = updatedRodo;
    }


    if (student && rodoId) {
        try {
            const sess = await mongoose.startSession();
            sess.startTransaction();
            // settings.rodoConsents.push(student);
            await settings.save({ session: sess });
            // student.rodoConsents.push(settings);
            await student.save({ session: sess });
            await sess.commitTransaction();
        } catch (err) {
            console.log(err);
            const error = new HttpError('Nie udało mi się zapisać zgody.', 500);
            return next(error);
        }
    } else {
        try {
            await settings.save();
        } catch (err) {
            const error = new HttpError('Nie udało mi się utworzyć nowego rodo.', 500);
            return next(error);
        }
    }


    res.status(200).json({ message: 'sukces', settings });
}



const setCourse = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { newCourseTitle, newCourseLength, newCoursePrice, newCourseDesc } = req.body;

    let settings;
    try {
        settings = await Setting.findOne();
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć ustawień.', 500);
        return next(error);
    }

    const course = {
        id: uuid(),
        newCourseTitle,
        newCourseLength,
        newCoursePrice,
        newCourseDesc
    }

    if (!settings) {
        settings = new Setting({
            courses: [course]
        });
    } else if (settings) {
        const updatedCourses = settings.courses;
        updatedCourses.unshift(course);
        settings.courses = updatedCourses;
    }

    try {
        await settings.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się utworzyć nowego kursu.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'sukces', settings });
}


const setInternalMessage = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { internalMessage, firstInternalMessageDay, lastInternalMessageDay, messageToStudents, messageToTeachers, msgId, teacherId, studentId } = req.body;

    let settings;
    try {
        settings = await Setting.findOne();
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć ustawień.', 500);
        return next(error);
    }

    const createdInternalMessage = {
        id: uuid(),
        internalMessage,
        firstInternalMessageDay,
        lastInternalMessageDay,
        messageToStudents,
        messageToTeachers,
        readBy: []
    }

    let teacher;
    let student;

    if (!settings) {
        settings = new Setting({
            internalMessages: [createdInternalMessage]
        });
    } if (settings && !msgId && !teacherId) {
        const updatedInternalMessages = settings.internalMessages;
        updatedInternalMessages.unshift(createdInternalMessage);
        settings.internalMessages = updatedInternalMessages;
    }


    if (settings && teacherId && msgId) {

        try {
            teacher = await Teacher.findById(teacherId);
        } catch (err) {
            const error = new HttpError('Nie udało mi się pobrać danych tego lektora.', 500);
            return next(error);
        }
        if (!teacher || teacher.length === 0) {
            const error = new HttpError('Nie znalazłem tego lektora w bazie danych.', 404);
            return next(error);
        }
    }

    if (settings && studentId && msgId) {

        try {
            student = await Student.findById(studentId);
        } catch (err) {
            const error = new HttpError('Nie udało mi się pobrać danych tego ucznia.', 500);
            return next(error);
        }
        if (!student || student.length === 0) {
            const error = new HttpError('Nie znalazłem tego ucznia w bazie danych.', 404);
            return next(error);
        }
    }


    const updatedInternalMessages = settings.internalMessages;

    for (let msg of updatedInternalMessages) {
        if (msg.id === msgId) {
            teacherId && msg.readBy.push(teacherId);
            studentId && msg.readBy.push(studentId);
            const index = updatedInternalMessages.findIndex(doc => doc.id === msgId);

            updatedInternalMessages.splice(index, 1, msg);

            if (teacherId) {
                if (teacher.internalMessages) {
                    teacher.internalMessages.push(msg);
                } else {
                    teacher.internalMessages = [];
                    teacher.internalMessages.push(msg);
                }
            }
            if (studentId) {
                if (student.internalMessages) {
                    student.internalMessages.push(msg);
                } else {
                    student.internalMessages = [];
                    student.internalMessages.push(msg);
                }
            }
        }
    }



    if (settings && (teacherId || studentId) && msgId) {
        try {
            const sess = await mongoose.startSession();
            sess.startTransaction();
            await settings.save({ session: sess });
            teacherId && await teacher.save({ session: sess });
            studentId && await student.save({ session: sess });
            await sess.commitTransaction();
        } catch (err) {
            const error = new HttpError('Nie udało mi się utworzyć nowej wiadomości systemowej.', 500);
            return next(error);
        }
    }
    if (settings && !msgId & !teacherId) {
        try {
            await settings.save();
        } catch (err) {
            const error = new HttpError('Nie udało mi się utworzyć nowej wiadomości systemowej.', 500);
            return next(error);
        }
    }



    res.status(200).json({ message: 'sukces', settings });
}


const deleteSettingType = async (req, res, next) => {
    const { settingType, id } = req.params;

    let settings;
    try {
        settings = await Setting.findOne();
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć ustawień.', 500);
        return next(error);
    }


    const deleteFrom = settings[settingType];
    const deleted = deleteFrom.filter(element => element.id !== id);

    settings[settingType] = deleted;

    try {
        await settings.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się utworzyć nowego kursu.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'sukces', settings });
};


exports.getSettings = getSettings;
exports.setSchoolYearSchedlue = setSchoolYearSchedlue;
exports.setBankAccount = setBankAccount;
exports.setRodo = setRodo;
exports.setCourse = setCourse;
exports.setInternalMessage = setInternalMessage;
exports.deleteSettingType = deleteSettingType;