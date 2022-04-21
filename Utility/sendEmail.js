const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: process.env.SENDGRID_API_KEY
    }
}));


const sendEmail = (emailTo, emailFrom, emailSubject, htmlMessage) => {

    transporter.sendMail({
        to: emailTo,
        from: emailFrom,
        subject: emailSubject,
        html: htmlMessage
    });
}

module.exports = sendEmail;