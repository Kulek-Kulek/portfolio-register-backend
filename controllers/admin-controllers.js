const { v1: uuid } = require('uuid');
const { validationResult } = require('express-validator');
const HttpError = require('../models/http-error');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HeadTeacher = require('../models/headTeacher');

const createHeadTeacher = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { name, surname, mobile, email, password } = req.body;

    let emailExists;
    try {
        emailExists = await HeadTeacher.findOne({ email });
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć takiego adresu email', 500);
        return next(error);
    }

    if (emailExists) {
        const error = new HttpError('Użytkownik z takim adresem email już istnieje. Zaloguj się.', 422);
        return next(error);
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        const error = new HttpError('Utworzenie nowego konta nie powiodło się.', 500);
        return next(error);
    }

    const createdHeadTeacher = new HeadTeacher({
        id: uuid(),
        name,
        surname,
        email,
        password: hashedPassword,
        mobile,
        status: 'HeadTeacher'
    });

    try {
        await createdHeadTeacher.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się utworzyć nowego konta HeadTeacher.', 500);
        return next(error);
    }


    let token;
    try {
        token = jwt.sign(
            {
                userId: createdHeadTeacher.id,
                email: createdHeadTeacher.email,
                status: createdHeadTeacher.status
            },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );
    } catch (err) {
        const error = new HttpError('Nie udało mi się utworzyć nowego konta HeadTeachera', 500);
        return next(error);
    }

    res.status(200).json(
        {
            userId: createdHeadTeacher.id,
            emai: createdHeadTeacher.email,
            status: createdHeadTeacher.status,
            token,
        });
};



exports.createHeadTeacher = createHeadTeacher;