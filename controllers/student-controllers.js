const { v1: uuid } = require('uuid');
const { v4: random_UUID } = require('uuid');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendSMS = require('../Utility/sendSMS');
const sendEmail = require('../Utility/sendEmail');

const HttpError = require('../models/http-error');
const Student = require('../models/student');
const Course = require('../models/course');
const Teacher = require('../models/teacher');
const HeadTeacher = require('../models/headTeacher');
const Group = require('../models/group');
const Settings = require('../models/setting');


const getStudents = async (req, res, next) => {

    const archive = req.params.data;

    let students;
    try {
        students = await Student.find({ archive: archive }, '-status -password')
            .populate({ path: 'group', match: { archive: false } })
            .populate('courses')
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać listy uczniów', 500);
        return next(error);
    }
    if (!students || students.length === 0) {
        const error = new HttpError('Nie znalazłem żadnych uczniów w bazie danych.', 404);
        return next(error);
    }

    res.json({ students: students.map(student => student.toObject({ getters: true })) });
};


const getOneStudent = async (req, res, next) => {
    let student;
    const studentId = req.params.studentId;


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

    try {
        student = await Student.findById(studentId, '-status -password')
            .populate('courses topics')
            .populate({ path: 'group', match: { archive: false }, populate: { path: 'group' } })
            .populate({
                path: 'grades', match: { creationDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay), $lte: new Date(endDateYear, endDateMonth, endDateDay) } },
                populate: { path: 'createdBy', select: '-password -status -passwordResetToken -passwordResetTokenExpiration' }
            })
            .populate({ path: 'group', match: { archive: false }, populate: { path: 'teacher', select: '-password -status -passwordResetToken -passwordResetTokenExpiration' } })

    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać danych tego ucznia.', 500);
        return next(error);
    }
    if (!student || student.length === 0) {
        const error = new HttpError('Nie znalazłem tego ucznia w bazie danych.', 404);
        return next(error);
    }


    const currentEndTermGrades = student.endTermGrades.filter(g => new Date(g.creationDate).getTime() >= new Date(currentSchoolYearStart).getTime() && new Date(g.creationDate) <= new Date(currentSchoolYearEnd).getTime());


    student.endTermGrades = currentEndTermGrades;

    res.json({ student: student.toObject({ getters: true }) });
};


const signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { name, surname, mobile, email, birthday, birthplace, password, courseId, street, zipcode, city, placeNumber, invoiceData, supervisorOneData, supervisorTwoData } = req.body;


    let emailExists;
    try {
        emailExists = await Student.findOne({ email });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć takiego adresu email', 500);
        return next(error);
    }

    if (!emailExists || emailExists.length === 0) {
        try {
            emailExists = await Teacher.findOne({ email });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć takiego adresu emaila', 500);
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

    if (emailExists) {
        const error = new HttpError('Użytkownik z takim adresem email już istnieje. Zaloguj się.', 422);
        return next(error);
    }

    let course;
    try {
        course = await Course.findOne({ courseTitle: courseId });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć takiego kursu', 500);
        return next(error);
    }

    if (!course || course.length === 0) {
        const error = new HttpError('Nie ma takiego kursu.', 422);
        return next(error);
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        const error = new HttpError('Utworzenie nowego konta nie powiodło się.', 500);
        return next(error);
    }

    let createdSupervisorOne = supervisorOneData;
    createdSupervisorOne.id = uuid();
    createdSupervisorOne.status = 'Supervisor';
    let createdSupervisorTwo = supervisorTwoData;
    createdSupervisorTwo.id = uuid();
    createdSupervisorTwo.status = 'Supervisor';
    if (supervisorOneData.password) {
        let hashedSupervisorOnePassword;
        try {
            hashedSupervisorOnePassword = await bcrypt.hash(password, 12);
            createdSupervisorOne.password = hashedSupervisorOnePassword;
        } catch (err) {
            const error = new HttpError('Utworzenie nowego konta nie powiodło się.', 500);
            return next(error);
        }
    }

    if (supervisorTwoData.password) {
        let hashedSupervisorTwoPassword;
        try {
            hashedSupervisorTwoPassword = await bcrypt.hash(password, 12);
            createdSupervisorTwo.password = hashedSupervisorTwoPassword;
        } catch (err) {
            const error = new HttpError('Utworzenie nowego konta nie powiodło się.', 500);
            return next(error);
        }
    }

    const createdStudent = new Student({
        id: uuid(),
        name,
        surname,
        email,
        password: hashedPassword,
        mobile,
        birthday,
        birthplace,
        address: { street, zipcode, city, placeNumber },
        invoiceData,
        status: 'student',
        group: [],
        topics: [],
        courses: [course],
        invoices: [],
        documents: [],
        grades: [],
        endTermGrades: [],
        supervisors: [createdSupervisorOne, createdSupervisorTwo],
        archive: false
    });

    try {
        await createdStudent.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się utworzyć nowego konta studenta', 500);
        return next(error);
    }


    let token;
    try {
        token = jwt.sign(
            {
                userId: createdStudent.id,
                email: createdStudent.email,
            },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );
    } catch (err) {
        const error = new HttpError('Nie udało mi się utworzyć nowego konta studenta', 500);
        return next(error);
    }

    let student = createdStudent.toObject({ getters: true });
    delete student.password
    delete student.status


    res.status(200).json(
        {
            userId: createdStudent.id,
            emai: createdStudent.email,
            token,
            student
        });
};


const updateStudent = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        return next(new HttpError('Wprowadziłeś niepoprawne dane!', 422));
    }

    const { name, surname, email, mobile, birthday, birthplace, address, updatedInvoiceData, invoiceEmail, type, invoiceBalance, invoiceDeadline, rates, financialStatus, documentId, updatedSupervisorOneNameSurname, updatedSupervisorOneMobile, updatedSupervisorOneEmail, updatedSupervisorTwoNameSurname, updatedSupervisorTwoMobile, updatedSupervisorTwoEmail, archive } = req.body;

    const studentId = req.params.id;

    let student;
    try {
        student = await Student.findById(studentId, '-status -password')
            .populate({ path: 'group', populate: { path: 'teacher' } })
            .populate({ path: 'grades' })
            .populate({ path: 'topics' })

    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tego ucznia.', 500);
        return next(error);
    }

    if (!student || student.length === 0) {
        const error = new HttpError('Nie znalazłem tego ucznia w bazie danych.', 404);
        return next(error);
    }

    let emailExists;
    try {
        emailExists = await Student.findOne({ email });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć takiego adresu email', 500);
        return next(error);
    }


    if (!emailExists || emailExists.length === 0) {
        try {
            emailExists = await Teacher.findOne({ email });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć takiego adresu emaila', 500);
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



    if (emailExists && emailExists.id.toString() !== studentId) {
        const error = new HttpError('Użytkownik z takim adresem email już istnieje.', 422);
        return next(error);
    }

    let invoices;
    let documents;
    if (req.file) {
        if (type === 'invoice') {
            const originalname = req.file.originalname;
            const invoices = student.invoices;
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
        if (type === 'studentDocument') {
            const originalname = req.file.originalname;
            const documents = student.documents;
            documents.unshift(
                {
                    id: uuid(),
                    path: req.file.location,
                    originalname,
                    key: req.file.key,
                    bucket: req.file.bucket,
                    type
                }
            );
        }
    }

    const updatedFinancialRates = student.financialRates;
    if (rates) {
        for (let rate of rates) {
            rate.id = random_UUID();
            rate.type = 'financialRates';
            updatedFinancialRates.unshift(rate);
        }
    }

    let updatedDocument;
    if (type === 'financialRatesUpdateStatus') {
        for (let doc of updatedFinancialRates) {
            if (doc.id === documentId) {
                updatedDocument = doc;
                updatedDocument.documentStatus = financialStatus;
                const index = updatedFinancialRates.findIndex(doc => doc.id === documentId);
                updatedFinancialRates.splice(index, 1, updatedDocument);
            }
        }
    }

    const updatedInvoices = student.invoices;
    if (type === 'invoiceUpdateStatus') {
        for (let doc of updatedInvoices) {
            if (doc.id === documentId) {
                updatedDocument = doc;
                updatedDocument.invoiceStatus = financialStatus;
                const index = updatedInvoices.findIndex(doc => doc.id === documentId);
                updatedInvoices.splice(index, 1, updatedDocument);
            }
        }
    }


    let studentInvoiceData;
    if (updatedInvoiceData && Object.keys(updatedInvoiceData).length > 0 && updatedInvoiceData.constructor === Object) {
        studentInvoiceData = updatedInvoiceData;
    } else {
        studentInvoiceData = student.invoiceData;
    }


    const updatedSupervisors = student.supervisors && student.supervisors.length > 0 ? student.supervisors : [{ password: null, status: 'Supervisor' }, { password: null, status: 'Supervisor' }];

    const supervisorOne = updatedSupervisors[0];
    supervisorOne.name = updatedSupervisorOneNameSurname || '';
    supervisorOne.mobile = updatedSupervisorOneMobile || '';
    supervisorOne.email = updatedSupervisorOneEmail || '';
    updatedSupervisors.splice(0, 1, supervisorOne);

    const supervisorTwo = updatedSupervisors[1];
    supervisorTwo.name = updatedSupervisorTwoNameSurname || '';
    supervisorTwo.mobile = updatedSupervisorTwoMobile || '';
    supervisorTwo.email = updatedSupervisorTwoEmail || '';
    updatedSupervisors.splice(1, 1, supervisorTwo);


    student.name = name;
    student.surname = surname;
    student.email = email;
    student.mobile = mobile;
    student.birthday = birthday ? birthday : student.birthday;
    student.address = address ? address : student.address;
    student.birthplace = birthplace ? birthplace : student.birthplace;
    student.invoiceData = studentInvoiceData;
    student.invoices = updatedInvoices;
    student.financialRates = updatedFinancialRates;
    student.supervisors = updatedSupervisors;
    student.archive = archive === undefined ? student.archive : archive;

    if (invoices !== undefined) {
        student.invoices = invoices;
    }
    if (documents !== undefined) {
        student.documents = documents;
    }

    try {
        await student.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się zapisać w bazie danych tego ucznia.', 500);
        return next(error);
    }

    if (type === 'invoice' || type === 'studentDocument' || type === 'financialRates') {
        try {
            const emailTo = invoiceEmail || email;

            const emailFrom = process.env.COMPANY_EMAIL;

            const emailSubject = `${process.env.COMPANY_NAME} - nowe dokumenty ${type !== 'studentDocument' ? 'finansowe.' : '.'}`;

            const htmlMessage = `<h3>Dzień dobry,</h3><p>Na Twoim koncie w systemie ${process.env.COMPANY_NAME} pojawił się nowy dokument ${type !== 'studentDocument' ? 'rozliczeniowy.' : '.'}</p><p>Kliknij <a href=${process.env.COMPANY_REGISTER_URL}>Zaloguj mnie do systemu</a>, żeby sprawdzić szczegóły.</p></h3><h3>Pozdrawiamy,</h3><h3>Zespół ${process.env.COMPANY_NAME}</h3></h3>`;

            sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);

        } catch (err) {
            const error = new HttpError('Nie udało mi się wysłać powiadomień mailowych o wystawieniu dokumentu finansowego.', 500);
            return next(error);
        }
    }


    if (financialStatus === 'overdue') {
        try {
            const emailTo = invoiceEmail || email;

            const emailFrom = process.env.COMPANY_EMAIL;

            const emailSubject = `${process.env.COMPANY_NAME} - nieopłacona faktura.`;

            const htmlMessage = `<h3>Dzień dobry,</h3><p>Na Twoim koncie w systemie ${process.env.COMPANY_NAME} znajdują sie dokumenty finansowe, którym upłynął termin płatności.</p><p>Kliknij <a href=${process.env.COMPANY_REGISTER_URL}>Zaloguj mnie do systemu</a>, żeby sprawdzić szczegóły.</p><p>Jeśli dokument został już opłacony, potraktuj tę wiadomość jako nieaktualną.</p></h3><h3>Pozdrawiamy,</h3><h3>Zespół ${process.env.COMPANY_NAME}</h3></h3>`;

            sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);
        } catch (err) {
            const error = new HttpError('Nie udało mi się wysłać powiadomienia mailowego o przeterminowanym dokumencie rozliczeniowym.', 500);
            return next(error);
        }
    }

    if (type === 'invoice' || type === 'financialRates' || financialStatus === 'overdue') {
        try {
            const from = process.env.COMPANY_NAME;
            const to = +("48" + mobile);
            const text = `Dzien dobry. Na Twoim koncie w systemie ${process.env.COMPANY_NAME} ${financialStatus === 'overdue' ? 'znajduja sie dokumenty finansowe, ktorym uplynal termin platnosci. Prosimy o uregulowanie zadluzenia' : 'pojawil sie nowy dokument rozliczeniowy'}. Zaloguj sie i sprawdz szczegoly. ${process.env.COMPANY_REGISTER_URL}`

            sendSMS(from, to, text);
        } catch (err) {
            const error = new HttpError('Nie udało mi się wysłać powiadomienia SMS o przeterminowanym dokumencie rozliczeniowym.', 500);
            return next(error);
        }
    }

    let response = { message: 'Zaktualizowałem dane ucznia', student: student.toObject({ getters: true }) }
    if (archive !== undefined) {
        let students;
        try {
            students = await Student.find({ archive: !archive }, '-status -password')
                .populate('group')
                .populate('courses')
        } catch (err) {
            const error = new HttpError('Nie udało mi się pobrać listy uczniów', 500);
            return next(error);
        }
        if (!students || students.length === 0) {
            const error = new HttpError('Nie znalazłem żadnych uczniów w bazie danych.', 404);
            return next(error);
        }
        response = { message: 'Przeniosłem ucznia do archiwum', students: students.map(student => student.toObject({ getters: true })) }
    }


    res.status(200).json(response);
}



const createStudentEndTermGrade = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane!', 422));
    }

    const { endStudentTermGrade, groupId } = req.body;
    const studentId = req.params.id;

    let student;
    try {
        student = await Student.findById(studentId, '-status -password');
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tego ucznia.', 500);
        return next(error);
    }

    if (!student || student.length === 0) {
        const error = new HttpError('Nie znalazłem tego ucznia w bazie danych.', 404);
        return next(error);
    }

    endStudentTermGrade.id = uuid();

    let updatedEndTermGrades = student.endTermGrades;

    let gradeUpdated = false;
    if (updatedEndTermGrades && updatedEndTermGrades.length > 0) {
        for (let grade of updatedEndTermGrades) {
            if (grade.groupId === groupId && grade.endTermGradeType === endStudentTermGrade.endTermGradeType) {
                const index = updatedEndTermGrades.findIndex(doc => doc.endTermGradeType === endStudentTermGrade.endTermGradeType && doc.groupId === groupId);
                updatedEndTermGrades.splice(index, 1, endStudentTermGrade);
                gradeUpdated = true;
            }
        }
    }

    !gradeUpdated && updatedEndTermGrades.push(endStudentTermGrade);


    student.endTermGrades = updatedEndTermGrades;

    try {
        await student.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się zapisać oceny semestralnej / końcoworocznej w bazie danych.', 500);
        return next(error);
    }


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

    res.json({ message: 'Zaktualizowałem dane ucznia', group: group.toObject({ getters: true }) });
}


const uploadStudentImage = async (req, res, next) => {
    let student;
    const studentId = req.body.userId;
    const file = req.file;

    try {
        student = await Student.findById(studentId, '-status -password');
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać danych tego ucznia.', 500);
        return next(error);
    }
    if (!student || student.length === 0) {
        const error = new HttpError('Nie znalazłem tego uczia w bazie danych.', 404);
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

    student.profileImage = profileImage;

    try {
        await student.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się zapisać w bazie danych zdjęcia profilowego tego ucznia.', 500);
        return next(error);
    }

    res.json({ message: 'success', student: student.toObject({ getters: true }) });
};

const deleteStudent = async (req, res, next) => {
    const studentId = req.params.id;

    let student;
    try {
        student = await Student.findById(studentId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tego ucznia, żeby go usunąć.', 500);
        return next(error);
    }

    if (!student || student.length === 0) {
        const error = new HttpError('Nie znalazłem żadnych uczniów w bazie danych.', 404);
        return next(error);
    }

    try {
        await student.remove();
    } catch (err) {
        const error = new HttpError('Nie udało mi się usunąć tego ucznia.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'Uczeń usunięty z bazy danych.', student });
};

const deleteFinancialDocument = async (req, res, next) => {
    const { studentId, documentId } = req.params;

    let student;
    try {
        student = await Student.findById(studentId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tego ucznia, żeby go usunąć.', 500);
        return next(error);
    }
    if (!student || student.length === 0) {
        const error = new HttpError('Nie znalazłem żadnych uczniów w bazie danych.', 404);
        return next(error);
    }

    let updatedFinancialRates = student.financialRates;
    let updatedInvoices = student.invices;

    updatedFinancialRates = updatedFinancialRates && updatedFinancialRates.length > 0 && updatedFinancialRates.filter(doc => doc.id !== documentId);
    updatedInvoices = updatedInvoices && updatedInvoices.length > 0 && updatedInvoices.filter(doc => doc.id !== documentId);

    student.invoices = updatedInvoices;
    student.financialRates = updatedFinancialRates;

    try {
        await student.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się usunąć tego dokumentu.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'Dokument usunięty z bazy danych.', student });

}



const archiveStudents = async (req, res, next) => {
    let students;
    try {
        students = await Group.find();
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać listy uczniów.', 500);
        return next(error);
    }
    if (!students || students.length === 0) {
        const error = new HttpError('Nie znalazłem żadnych uczniów w bazie danych.', 404);
        return next(error);
    }

    for (let student of students) {
        // student.name = 'JA - ' + student.name;
        // student.archive = false;
        student.schoolYear = '2021/2022';
        student.courseName = 'język angielski';
        // student.groupLevel = 'A1';
        // student.certificateType = 'Certyfikat dla dzieci'
        try {
            await student.save();
        } catch (err) {
            console.log(err);
        }
    }

    res.json({ students: students.map(student => student.toObject({ getters: true })) });
};


exports.getStudents = getStudents;
exports.getOneStudent = getOneStudent;
exports.signup = signup;
exports.updateStudent = updateStudent;
exports.createStudentEndTermGrade = createStudentEndTermGrade;
exports.uploadStudentImage = uploadStudentImage;
exports.deleteStudent = deleteStudent;
exports.deleteFinancialDocument = deleteFinancialDocument;
exports.archiveStudents = archiveStudents;