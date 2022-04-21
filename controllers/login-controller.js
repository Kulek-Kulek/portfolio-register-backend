const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../Utility/sendEmail');
const HttpError = require('../models/http-error');
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const HeadTeacher = require('../models/headTeacher');



const loginUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { email, password } = req.body;


    let userExists;
    try {
        userExists = await Student.findOne({ email });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
        return next(error);
    }



    if (!userExists) {
        try {
            userExists = await Teacher.findOne({ email });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
            return next(error);
        }
    }

    if (!userExists) {
        try {
            userExists = await HeadTeacher.findOne({ email });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
            return next(error);
        }
    }

    if (!userExists || userExists.length === 0) {
        const error = new HttpError('Błędny email lub hasło.', 401);
        return next(error);
    }

    let passwordIsValid = false;
    try {
        passwordIsValid = await bcrypt.compare(password, userExists.password);
    } catch (err) {
        const error = new HttpError('Nie udało mi się zalogować. Spróbuj ponownie.', 500);
        return next(error);
    }

    if (!passwordIsValid) {
        const error = new HttpError('Błędny email lub hasło!', 401);
        return next(error);
    }


    let token;
    try {
        token = jwt.sign(
            {
                userId: userExists.id,
                email: userExists.email,
                status: userExists.status
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
            userId: userExists.id,
            email: userExists.email,
            token,
            userStatus: userExists.status
        });
};


exports.loginUser = loginUser;




const passwordReset = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

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

    const email = req.body.email;

    let userExists;

    try {
        userExists = await Student.findOne({ email });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
        return next(error);
    }

    if (!userExists) {
        try {
            userExists = await Teacher.findOne({ email });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
            return next(error);
        }
    }

    if (!userExists) {
        try {
            userExists = await HeadTeacher.findOne({ email });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
            return next(error);
        }
    }


    if (!userExists) {
        const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 401);
        return next(error);
    }

    userExists.passwordResetTokenExpiration = Date.now() + 1800000;
    userExists.passwordResetToken = passwordResetToken;

    try {
        userExists.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się zresetować hasła.', 500);
        return next(error);
    }

    try {
        const emailTo = email;

        const emailFrom = process.env.COMPANY_EMAIL;

        const emailSubject = 'Reset hasła';

        const htmlMessage = `<h3>Kliknij <a href=${process.env.COMPANY_REGISTER_URL}password-reset/user/${passwordResetToken}>zmień moje hasło</a>, żeby ustanowić nowe hasło do logowanie się w e-sekretariacie.</h3><h3>Pozdrawiamy,</h3><h3>Zespół ${process.env.COMPANY_NAME}</h3>`;

        // const htmlMessage = `<h3>Kliknij <a href=http://localhost:3000/password-reset/user/${passwordResetToken}>zmień moje hasło</a>, żeby ustanowić nowe hasło do logowanie się w e-sekretariacie.</h3><h3>Pozdrawiamy,</h3><h3>Zespół ${process.env.COMPANY_NAME}</h3>`;

        sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);
    } catch (err) {
        console.log(err);
    }

    res.status(200).json({ message: 'Link do zmiany hasła wysłany na podany adres.' });
}


const getUserUpdatingPassword = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }
    const token = req.params.token;
    let userExists;

    try {
        userExists = await Student.findOne({ passwordResetToken: token, passwordResetTokenExpiration: { $gt: Date.now() } });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
        return next(error);
    }

    if (!userExists) {
        try {
            userExists = await Teacher.findOne({ passwordResetToken: token, passwordResetTokenExpiration: { $gt: Date.now() } });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
            return next(error);
        }
    }

    if (!userExists) {
        try {
            userExists = await HeadTeacher.findOne({ passwordResetToken: token, passwordResetTokenExpiration: { $gt: Date.now() } });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
            return next(error);
        }
    }

    if (!userExists) {
        const error = new HttpError('Nie udało mi się znaleźć użytkownika.', 401);
        return next(error);
    }

    res.status(200).json({ userId: userExists._id });
}


const updatePassword = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const token = req.params.token;
    const { updatedPassword, userId } = req.body;

    let userExists;

    try {
        userExists = await Student.findOne({
            passwordResetToken: token,
            passwordResetTokenExpiration: { $gt: Date.now() },
            _id: userId
        });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
        return next(error);
    }

    if (!userExists) {
        try {
            userExists = await Teacher.findOne({
                passwordResetToken: token,
                passwordResetTokenExpiration: { $gt: Date.now() },
                _id: userId
            });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
            return next(error);
        }
    }

    if (!userExists) {
        try {
            userExists = await HeadTeacher.findOne({
                passwordResetToken: token,
                passwordResetTokenExpiration: { $gt: Date.now() },
                _id: userId
            });
        } catch (err) {
            const error = new HttpError('Nie udało mi się znaleźć użytkownika o takim adresie email.', 500);
            return next(error);
        }
    }

    if (!userExists) {
        const error = new HttpError('Nie udało mi się znaleźć użytkownika.', 401);
        return next(error);
    }

    let hashedUpdatedPassword;
    try {
        hashedUpdatedPassword = await bcrypt.hash(updatedPassword, 12);
    } catch (err) {
        const error = new HttpError('Utworzenie nowego hasła nie powiodło się.', 500);
        return next(error);
    }

    userExists.password = hashedUpdatedPassword;
    userExists.passwordResetToken = null;
    userExists.passwordResetTokenExpiration = undefined;

    try {
        userExists.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się zresetować hasła.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'Zmieniłem hasło. Zaloguj się.' });
}


exports.loginUser = loginUser;
exports.getUserUpdatingPassword = getUserUpdatingPassword;
exports.passwordReset = passwordReset;
exports.updatePassword = updatePassword;