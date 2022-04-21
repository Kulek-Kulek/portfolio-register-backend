const { v1: uuid } = require('uuid');
const { validationResult } = require('express-validator');

const sendSMS = require('../Utility/sendSMS');
const sendEmail = require('../Utility/sendEmail');

const HttpError = require('../models/http-error');
const Contact = require('../models/contact');

const createContact = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne lub niekompletne dane.', 422));
    }

    const { contactName, contactMobile, contactEmail, contactComment } = req.body;

    const createdContact = new Contact({
        id: uuid(),
        contactName,
        contactMobile,
        contactEmail,
        contactComment
    });

    try {
        const comment = await createdContact.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się stworzyć tego komentarza.', 500);
        return next(error);
    }

    try {
        const emailTo = process.env.COMPANY_EMAIL;

        const emailFrom = process.env.COMPANY_EMAIL;

        const emailSubject = `Nowe zapytanie ze strony ${process.env.COMPANY_NAME}`;

        const htmlMessage = `<h3>${contactName} napisał:</h3><p>${contactComment}</p><h3>Telefon: ${contactMobile}, email: ${contactEmail}</h3>`;

        sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);
    } catch (err) {
        console.log(err);
    }



    res.status(200).json({ message: 'Formularz zapisany.', order: createdContact.toObject({ getters: true }) });
}



const createContactMariaLp = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne lub niekompletne dane.', 422));
    }

    const { name, mobile, email, comment, surname } = req.body;

    try {
        let emailTo = process.env.COMPANY_EMAIL;

        const emailFrom = email;

        let emailSubject = 'Zapytanie o dziennik';

        let htmlMessage = `<h3>${name} ${surname ? surname : ''} napisał/a:</h3><p>${comment}</p><h3>Telefon: ${mobile}, email: ${email}</h3>`;

        sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);



        emailTo = email;

        htmlMessage = `<h3>Dzień dobry ${name},</h3><p>Otrzymaliśmy Twoją wiadmość. Skontaktujemy się z Tobą telefonicznie lub mailowo w ciągu jednego dnia roboczego.</p><h4>Pozdrawiamy,</h4><h3>Zespół okayProjects</h3>`;

        sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);

    } catch (err) {
        console.log(err);
    }

    let from = 'okayProjects';
    let to = +("48" + mobile);
    let text = 'Otrzymalismy Twoje zapytanie. Skontaktujemy sie z Toba w ciagu jednego dnia roboczego. Do uslyszenia.';

    sendSMS(from, to, text);


    to = +("48500097398");
    text = `Nowe zapytanie o dziennik od ${name} ${surname ? surname : ''}, tel. ${mobile}`;

    sendSMS(from, to, text);

    res.status(200).json({ message: 'Wiadomość wysłana' });
}


const createContactOkayProjectsLandingPage = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne lub niekompletne dane.', 422));
    }

    const { name, mobile, email, comment, surname } = req.body;

    try {
        let emailTo = process.env.COMPANY_EMAIL;

        const emailFrom = email;

        let emailSubject = 'okayProjects response';

        let htmlMessage = `<h3>${name} ${surname ? surname : ''} wrote:</h3><p>${comment}</p><h3>Phone: ${mobile}, email: ${email}</h3>`;

        sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);


        emailTo = email;

        htmlMessage = `<h3>Hello ${name},</h3><p>I've received your message. I'll get in touch with you no later than within a working day time.</p><h4>Take care,</h4><h3>{okayProjects}</h3>`;

        sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);

    } catch (err) {
        console.log(err);
    }

    let from = 'okayProjects';
    let to = +("48" + mobile);
    let text = "I've received your message. I'll get in touch with you no later than within a working day time. Thank you";

    sendSMS(from, to, text);


    to = +("48500097398");
    text = `New query from ${name} ${surname ? surname : ''}, tel. ${mobile}`;

    sendSMS(from, to, text);

    res.status(200).json({ message: 'Message sent' });
}


exports.createContact = createContact;
exports.createContactMariaLp = createContactMariaLp;
exports.createContactOkayProjectsLandingPage = createContactOkayProjectsLandingPage;