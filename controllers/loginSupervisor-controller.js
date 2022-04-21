const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../Utility/sendEmail');
const HttpError = require('../models/http-error');
const Student = require('../models/student');





const loginSupervisor = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { studentEmail, supervisorEmail, supervisorPassword } = req.body;
    const email = studentEmail;
    let studentExists;
    try {
        studentExists = await Student.findOne({ email });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
        return next(error);
    }


    if (!studentExists || studentExists.length === 0) {
        const error = new HttpError('Nie masz uprawnień do logowania się na konto tego kursanta.', 401);
        return next(error);
    }

    let supervisor;
    for (let studentSupervisor of studentExists.supervisors) {
        if (studentSupervisor.email === supervisorEmail) {
            supervisor = studentSupervisor;
        }
    }



    let passwordIsValid = false;
    try {
        passwordIsValid = await bcrypt.compare(supervisorPassword, supervisor.password);
    } catch (err) {
        const error = new HttpError('Nie udało mi się zalogować. Błędny email lub hasło.', 500);
        return next(error);
    }

    if (!passwordIsValid) {
        const error = new HttpError('Błędny email lub hasło!!!', 401);
        return next(error);
    }


    let token;
    try {
        token = jwt.sign(
            {
                userId: studentExists.id,
                email: studentExists.email,
            },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );
    } catch (err) {
        const error = new HttpError('Nie udało mi się zalogować.', 500);
        return next(error);
    }

    res.json(
        {
            userId: studentExists.id,
            email: studentExists.email,
            token,
            userStatus: supervisor.status
        });
}



const passwordResetSupervisor = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const supervisorEmail = req.body.email;

    let passwordResetToken;

    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            const error = new HttpError('Upss. Coś poszło nie tak. Spróbuj później.', 500);
            return next(error);
        }
        try {
            passwordResetToken = buffer.toString('hex');
        } catch (err) {
            const error = new HttpError('Upss. Coś poszło nie tak. Spróbuj później.', 500);
            return next(error);
        }
    })



    let allStudents;

    try {
        allStudents = await Student.find();
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
        return next(error);
    }


    if (!allStudents || allStudents.length === 0) {
        const error = new HttpError('Nie udało mi się znaleźć żadnego ucznia.', 401);
        return next(error);
    }

    const studentsWithThisSupervisor = [];
    for (let student of allStudents) {
        for (let supervisor of student.supervisors) {
            if (supervisor.email === supervisorEmail) {
                studentsWithThisSupervisor.push(student);
            }
        }
    }

    if (!studentsWithThisSupervisor || studentsWithThisSupervisor.length === 0) {
        const error = new HttpError('Nie udało mi się znaleźć rodzica lub pracodawcy o takim adresie email.', 401);
        return next(error);
    }

    for (let student of studentsWithThisSupervisor) {
        let studentWithSupervisor;
        let email = student.email;
        try {
            studentWithSupervisor = await Student.findOne({ email });
        }
        catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć takiego adresu email', 500);
            return next(error);
        }
        for (let supervisor of studentWithSupervisor.supervisors) {
            if (supervisor.email === supervisorEmail) {
                const updatedSupervisor = supervisor;
                updatedSupervisor.passwordResetTokenExpiration = Date.now() + 1800000;
                updatedSupervisor.passwordResetToken = passwordResetToken;

                const index = studentWithSupervisor.supervisors.findIndex(doc => doc.email === supervisorEmail);

                studentWithSupervisor.supervisors.splice(index, 1, updatedSupervisor);
            }
        }
        studentWithSupervisor.supervisorPasswordResetToken = passwordResetToken;
        studentWithSupervisor.supervisorPasswordResetTokenExpiration = Date.now() + 1800000;

        try {
            studentWithSupervisor.save();
        } catch (err) {
            const error = new HttpError('Nie udało mi się zresetować hasła.', 500);
            return next(error);
        }
    }

    try {
        const emailTo = supervisorEmail;

        const emailFrom = process.env.COMPANY_EMAIL;

        const emailSubject = 'Reset hasła';

        const htmlMessage = `<h3>Kliknij <a href=${process.env.COMPANY_REGISTER_URL}password-reset/parent/${passwordResetToken}>zmień moje hasło</a>, żeby ustanowić nowe hasło do logowanie się w e-sekretariacie.</h3><h3>Pozdrawiamy,</h3><h3>Zespół ${process.env.COMPANY_NAME}</h3>`;

        // const htmlMessage = `<h3>Kliknij <a href=http://localhost:3000/password-reset/parent/${passwordResetToken}>zmień moje hasło</a>, żeby ustanowić nowe hasło do logowanie się w e-sekretariacie.</h3><h3>Pozdrawiamy,</h3><h3>Zespół ${process.env.COMPANY_NAME}</h3>`;

        sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);
    } catch (err) {
        console.log(err);
    }

    res.status(200).json({ message: 'Link do zmiany hasła wysłany na podany adres.' });
}



const getSupervisorUpdatingPassword = async (req, res, next) => {

    const token = req.params.token;

    let userExists = [];

    try {
        userExists = await Student.find({ supervisorPasswordResetToken: token, supervisorPasswordResetTokenExpiration: { $gt: Date.now() } });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć użytkownika.', 500);
        return next(error);
    }


    if (!userExists || userExists.length === 0) {
        const error = new HttpError('Nie udało mi się znaleźć użytkownika. Ten link wygasł. Spróbuj ponownie.', 401);
        return next(error);
    }

    let userExistsIds = [];
    for (let user of userExists) {
        userExistsIds.push(user._id)
    }

    res.status(200).json({ userId: userExistsIds });
}



const updateSupervisorPassword = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.errors);
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const token = req.params.token;
    const { updatedPassword, userId } = req.body;

    let hashedUpdatedPassword;
    try {
        hashedUpdatedPassword = await bcrypt.hash(updatedPassword, 12);
    } catch (err) {
        const error = new HttpError('Utworzenie nowego hasła nie powiodło się.', 500);
        return next(error);
    }

    for (let studentId of userId) {
        let studentWithThisSupervisor;
        try {
            studentWithThisSupervisor = await Student.findOne({
                supervisorPasswordResetToken: token,
                supervisorPasswordResetTokenExpiration: { $gt: Date.now() },
                _id: studentId
            });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
            return next(error);
        }

        if (!studentWithThisSupervisor) {
            const error = new HttpError('Nie udało mi się znaleźć użytkownika.', 401);
            return next(error);
        }

        studentWithThisSupervisor.supervisorPasswordResetToken = null;
        studentWithThisSupervisor.supervisorPasswordResetTokenExpiration = undefined;

        let updatedSupervisor;
        for (supervisor of studentWithThisSupervisor.supervisors) {
            if (supervisor.passwordResetToken === token) {
                const index = studentWithThisSupervisor.supervisors.findIndex(doc => doc.passwordResetToken === token);
                updatedSupervisor = supervisor;
                updatedSupervisor.passwordResetToken = null;
                updatedSupervisor.passwordResetTokenExpiration = undefined;
                updatedSupervisor.password = hashedUpdatedPassword;

                studentWithThisSupervisor.supervisors.splice(index, 1, updatedSupervisor);
            }

        }
        try {
            studentWithThisSupervisor.save();
        } catch (err) {
            const error = new HttpError('Nie udało mi się zresetować hasła.', 500);
            return next(error);
        }
    }

    res.status(200).json({ message: 'Zmieniłem hasło. Zaloguj się.' });
}

exports.loginSupervisor = loginSupervisor;
exports.passwordResetSupervisor = passwordResetSupervisor;
exports.getSupervisorUpdatingPassword = getSupervisorUpdatingPassword;
exports.updateSupervisorPassword = updateSupervisorPassword;