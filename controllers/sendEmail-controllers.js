
const { validationResult } = require('express-validator');
const sendSMSs = require('../Utility/sendSMS');
const sendEmail = require('../Utility/sendEmail');

const HttpError = require('../models/http-error');


const sendEmailMessage = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne lub niekompletne dane.', 422));
    }

    const { subject, text, sender, recipients, sendSMS } = req.body;

    for (recipient of recipients) {
        try {
            const emailTo = recipient.email;

            const emailFrom = process.env.COMPANY_EMAIL;

            const emailSubject = subject;

            const htmlMessage = `<p>Masz wiadomość od ${sender.name || process.env.COMPANY_NAME} ${sender.surname ? sender.surname : ''}:</p><p>${text}</p>`;

            sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);

        } catch (err) {
            console.log(err);
        }
    }

    try {
        const emailTo = sender.email;

        const emailFrom = process.env.COMPANY_EMAIL;

        const emailSubject = `Tu ${process.env.COMPANY_NAME}`;

        const htmlMessage = `<p>Napisałeś: ${text}</p>`;

        sender.email && sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);

    } catch (err) {
        console.log(err);
    }

    if (sendSMS) {
        const from = process.env.COMPANY_NAME
        let to;
        for (recipient of recipients) {
            to = +("48" + recipient.mobile);

            sendSMSs(from, to, text);
        }
    }

    res.status(200).json({ message: 'Wiadomość wysłana.' });

}

exports.sendEmailMessage = sendEmailMessage;