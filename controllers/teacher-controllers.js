const { v1: uuid } = require('uuid');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendSMS = require('../Utility/sendSMS');
const sendEmail = require('../Utility/sendEmail');

const HttpError = require('../models/http-error');
const Teacher = require('../models/teacher');
const Student = require('../models/student');
const HeadTeacher = require('../models/headTeacher');


const getTeachers = async (req, res, next) => {
    const archive = req.params.data;
    let teachers;
    try {
        teachers = await Teacher.find({ archive: archive }, '-status -password')
            .populate({ path: 'group', match: { archive: false }, populate: { path: 'group' } });
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać listy lektorów.', 500);
        return next(error);
    }

    if (!teachers || teachers.length === 0) {
        const error = new HttpError('Nie masz żadnych lektorów w bazie danych.', 404);
        return next(error);
    }
    res.json({ teachers: teachers.map(teacher => teacher.toObject({ getters: true })) });
}


const getOneTeacher = async (req, res, next) => {
    let teacher;
    const teacherId = req.params.teacherId;

    try {
        teacher = await Teacher.findById(teacherId, '-status -password');
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać danych tego lektora.', 500);
        return next(error);
    }
    if (!teacher || teacher.length === 0) {
        const error = new HttpError('Nie znalazłem tego lektora w bazie danych.', 404);
        return next(error);
    }
    res.json({ teacher: teacher.toObject({ getters: true }) });
};


const getTeacherGroups = async (req, res, next) => {

    const teacherId = req.params.teacherId;

    let teacherWithGroups;
    try {
        teacherWithGroups = await Teacher.findById(teacherId, '-password -status ')
            .populate({ path: 'group', match: { archive: false }, populate: { path: 'group' } })
            .populate({ path: 'group', match: { archive: false }, populate: { path: 'topics' } })
            .populate({ path: 'group', match: { archive: false }, populate: { path: 'teacher', select: '-password -status' } })
            .populate({ path: 'group', match: { archive: false }, populate: { path: 'students', match: { archive: false }, select: '-password -status', populate: { path: 'grades' } } });
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać grup tego lektora.', 500);
        return next(error);
    }
    if (!teacherWithGroups || teacherWithGroups.length === 0) {
        const error = new HttpError('Nie udało mi się znaleźć lektora o takim id.', 500);
        return next(error);
    }

    res.json({ teacherWithGroups: teacherWithGroups.toObject({ getters: true }) });
}


const createTeacher = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { name, surname, mobile, email, password, zoomLink, zoomPassword, zoomMeetinId, bankaccount } = req.body;

    let emailExists;
    try {
        emailExists = await Teacher.findOne({ email });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć takiego adresu email', 500);
        return next(error);
    }
    if (!emailExists || emailExists.length === 0) {
        try {
            emailExists = await Student.findOne({ email });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć takiego adresu email', 500);
            return next(error);
        }
    }

    if (!emailExists || emailExists.length === 0) {
        try {
            emailExists = await HeadTeacher.findOne({ email });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć takiego adresu email', 500);
            return next(error);
        }
    }

    if (emailExists) {
        const error = new HttpError('Użytkownik z takim adresem email już istnieje.', 422);
        return next(error);
    }


    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        const error = new HttpError('Utworzenie nowego konta nie powiodło się.', 500);
        return next(error);
    }

    const createdTeacher = new Teacher({
        id: uuid(),
        name,
        surname,
        email,
        password: hashedPassword,
        mobile,
        zoom: {
            link: zoomLink,
            password: zoomPassword,
            meetingId: zoomMeetinId
        },
        bankaccount: bankaccount ? bankaccount : 'Brak danych',
        invoices: [],
        status: 'teacher',
        group: [],
        topics: [],
        archive: false
    });

    try {
        await createdTeacher.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się stworzyć nowego lektora.', 500);
        return next(error);
    }

    let token;
    try {
        token = jwt.sign(
            {
                userId: createdTeacher.id,
                email: createdTeacher.email,
            },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );
    } catch (err) {
        const error = new HttpError('Nie udało mi się utworzyć nowego konta studenta', 500);
        return next(error);
    }

    let teacher = createdTeacher.toObject({ getters: true });
    delete teacher.password
    delete teacher.status
    res.status(200).json(
        {
            userId: createdTeacher.id,
            email: createdTeacher.email,
            token,
            teacher
        });
}



const updateTeacher = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { name, surname, email, mobile, zoomLink, zoomPassword, zoomMeetinId, bankaccount, type, invoiceDeadline, invoiceBalance, archive } = req.body;
    const teacherId = req.params.id;

    let teacher;
    try {
        teacher = await Teacher.findById(teacherId, '-status -password');
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tego lektora', 500);
        return next(error);
    }
    if (!teacher || teacher.length === 0) {
        const error = new HttpError('Nie znalazłem tego lektora w bazie danych.', 404);
        return next(error);
    }

    let emailExists;
    try {
        emailExists = await Teacher.findOne({ email });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć takiego adresu email', 500);
        return next(error);
    }

    if (!emailExists || emailExists.length === 0) {
        try {
            emailExists = await Student.findOne({ email });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć takiego adresu email', 500);
            return next(error);
        }
    }

    if (!emailExists || emailExists.length === 0) {
        try {
            emailExists = await HeadTeacher.findOne({ email });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć takiego adresu emaila', 500);
            return next(error);
        }
    }

    if (emailExists && emailExists.id.toString() !== teacherId) {
        const error = new HttpError('Użytkownik z takim adresem email już istnieje.', 422);
        return next(error);
    }


    let invoices;
    if (req.file) {
        if (type === 'invoice') {
            const originalname = req.file.originalname;
            const invoices = teacher.invoices;
            invoices.unshift(
                {
                    id: uuid(),
                    path: req.file.location,
                    originalname,
                    key: req.file.key,
                    bucket: req.file.bucket,
                    invoiceBalance,
                    invoiceDeadline,
                    invoiceStatus: 'issued',
                    type
                }
            );
        }
    }

    const zoom = {
        link: zoomLink || teacher.zoom.link,
        password: zoomPassword || teacher.zoom.password,
        meetingId: zoomMeetinId || teacher.zoom.meetinId
    };

    teacher.name = name;
    teacher.surname = surname;
    teacher.email = email;
    teacher.mobile = mobile;
    teacher.zoom = zoom;
    teacher.bankaccount = bankaccount ? bankaccount : teacher.bankaccount;
    teacher.archive = archive === undefined ? teacher.archive : archive;
    if (invoices !== undefined) {
        teacher.invoices = invoices;
    }

    try {
        await teacher.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się zapisać w bazie danych tego lektora.', 500);
        return next(error);
    }

    if (req.file && type === 'invoice') {
        try {
            const emailTo = process.env.COMPANY_EMAIL;

            const emailFrom = email;

            const emailSubject = 'Nowe dokumenty finansowe';

            const htmlMessage = `<h3>Dzień dobry,</h3><p>W dzienniku elektronicznym szkoły ${process.env.COMPANY_NAME}, <strong>${name} ${surname}</strong> dodał nowy dokument rozliczeniowy.</p><p>Kliknij <a href=${process.env.COMPANY_REGISTER_URL}>Zaloguj mnie do systemu</a>, żeby sprawdzić szczegóły. Następnie wybierz właściwego lektora z zakładki 'lektorzy'. Dokument znajdziesz w sekcji 'Rozliczenia'.</h3><h3>Pozdrawiamy,</h3><h3>Zespół ${process.env.COMPANY_NAME}</h3></h3>`;

            sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);

        } catch (err) {
            const error = new HttpError('Dodałem dokument, ale nie udało mi się wysłać wiadomości e-mail.', 500);
            return next(error);
        }

        try {
            const from = process.env.COMPANY_NAME
            const to = +("48" + process.env.COMPANY_MOBILE);
            const text = `W dzienniku elektronicznym szkoły, ${name} ${surname} dodał/a nowy dokument rozliczeniowy. Kliknij ${process.env.COMPANY_REGISTER_URL} i sprawdz szczegóły. Wybierz lektora z zakładki 'lektorzy'. Dokument znajdziesz w sekcji 'Rozliczenia'.`;

            sendSMS(from, to, text);
        } catch (err) {
            const error = new HttpError('Dodałem dokument, ale nie udało mi się wysłać wiadomości SMS', 500);
            return next(error);
        }

    }


    let response = { message: 'Zaktualizowałem dane lektora.', teacher: teacher.toObject({ getters: true }) };
    if (archive !== undefined) {
        let teachers;
        try {
            teachers = await Teacher.find({ archive: !archive }, '-status -password')
                .populate({ path: 'group', match: { archive: !archive }, populate: { path: 'group' } });
        } catch (err) {
            const error = new HttpError('Nie udało mi się pobrać listy lektorów.', 500);
            return next(error);
        }

        if (!teachers || teachers.length === 0) {
            const error = new HttpError('Nie masz żadnych lektorów w bazie danych.', 404);
            return next(error);
        }

        response = { message: 'Przeniosłem lektora do archiwum', teachers: teachers.map(teacher => teacher.toObject({ getters: true })) }
    }


    res.json(response);
}


const uploadTeacherImage = async (req, res, next) => {
    let teacher;
    const teacherId = req.body.userId;
    const file = req.file;

    try {
        teacher = await Teacher.findById(teacherId, '-status -password');
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać danych tego lektora.', 500);
        return next(error);
    }
    if (!teacher || teacher.length === 0) {
        const error = new HttpError('Nie znalazłem tego lektora w bazie danych.', 404);
        return next(error);
    }

    const profileImage = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bucket: file.Bucket,
        key: file.key,
        acl: file.ACL,
        contentType: file.contentType,
        metadata: file.metadata,
        location: file.Location,
        contentType: file.ContentType,
        fieldname: file.fieldname,
        eTag: file.ETag
    }

    teacher.profileImage = profileImage;

    try {
        await teacher.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się zapisać w bazie danych tego lektora.', 500);
        return next(error);
    }

    res.json({ message: 'success', teacher: teacher.toObject({ getters: true }) });
};



const deleteTeacher = async (req, res, next) => {
    const teacherId = req.params.id;

    let teacher;
    try {
        teacher = await Teacher.findById(teacherId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tego lektora, żeby go usunąć', 500);
        return next(error);
    }

    try {
        await teacher.remove();
    } catch (err) {
        const error = new HttpError('Nie udało mi się usunąć tego lektora.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'Lektor usunięty z bazy danych.' });
};



exports.getTeachers = getTeachers;
exports.getOneTeacher = getOneTeacher;
exports.getTeacherGroups = getTeacherGroups;
exports.createTeacher = createTeacher;
exports.updateTeacher = updateTeacher;
exports.uploadTeacherImage = uploadTeacherImage;
exports.deleteTeacher = deleteTeacher;
