const { v1: uuid } = require('uuid');
const { validationResult } = require('express-validator');

const HttpError = require('../models/http-error');
const Order = require('../models/order');



const getOrders = async (req, res, next) => {
    let orders;
    try {
        orders = await Order.find();
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać zamówień.', 500);
        return next(error);
    }
    if (!orders || orders.length === 0) {
        orders = [];
    }

    res.json({ orders: orders.map(order => order.toObject({ getters: true })) });
};


const addOrder = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne lub niekompletne dane!', 422));
    }

    const { name, surname, mobile, email, comments, birthday, marketingRules, courseRules, lessonType, unavailable, coursePrice, courseName, submissionDate, submissionTime } = req.body;

    const createdOrder = new Order({
        id: uuid(),
        name,
        surname,
        mobile,
        email,
        comments,
        birthday,
        marketingRules,
        courseRules,
        lessonType,
        unavailable,
        coursePrice,
        courseName,
        submissionDate,
        submissionTime
    });


    try {
        await createdOrder.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się stworzyć tego zamówienia.', 500);
        return next(error);
    }

    try {

        let emailTo = process.env.COMPANY_EMAIL;

        let emailFrom = process.env.COMPANY_EMAIL;

        let emailSubject = 'Nowe zamówienie';

        let htmlMessage = `<h3>Dzień dobry ${name},</h3><h4>Zamówiłeś: "${courseName}".</h4><p>Twoje zamówienie jest już realizowane! Zadzwonimy pod numer ${mobile}, żeby omówić szczegóły. Nie zajmie nam to dłużej, niż 24 godziny. Do tego czasu nie dokonuj żadnej płatności.</p><h4>Pozdrawiamy serdecznie!</h3><h3>${process.env.COMPANY_NAME}</h3><h4>Przyjemność uczenia się.</h4>`;

        sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);


        emailTo = email;

        emailSubject = `Twoje zamówienie w ${process.env.COMPANY_NAME}`;

        htmlMessage = `<h3>Dzień dobry ${name},</h3><h4>Twoje zamówienie to: "${courseName}".</h4><p>Już je realizujemy! Zadzwonimy pod numer ${mobile}, żeby omówić szczegóły. Nie zajmie nam to dłużej, niż 24 godziny. Do tego czasu nie dokonuj żadnej płatności.</p><h4>Pozdrawiamy serdecznie!</h3><h3>${process.env.COMPANY_NAME}</h3><h4>Przyjemność uczenia się.</h4>`;
    } catch (err) {
        console.log(err);
    }



    res.status(200).json({ message: 'Zamówienie przyjęte', order: createdOrder.toObject({ getters: true }) });
}


exports.addOrder = addOrder;
exports.getOrders = getOrders;