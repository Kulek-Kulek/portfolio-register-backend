const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { v4: random_UUID } = require('uuid');

const HttpError = require('../models/http-error');
const Payments = require('../models/payments');
const Student = require('../models/student');
const PayWithPrzelewy24Payment = require('../models/payWithPrzelewy24Payment');

const getPayments = async (req, res, next) => {
    let payments;
    try {
        payments = await Payments.find();
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać danych szkoły.', 500);
        return next(error);
    }

    if (!payments || payments.length === 0) {
        const error = new HttpError('Nie masz wszystkich danych w bazie danych.', 404);
        return next(error);
    }

    res.json({ payments: payments.map(payment => payment.toObject({ getters: true })) });
}



const payWithPrzelewy24 = async (req, res, next) => {
    const { studentId, documentId } = req.params;

    let student;
    try {
        student = await Student.findById(studentId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać danych płatnika', 500);
        return next(error);
    }
    if (!student || student.length === 0) {
        const error = new HttpError('Nie znalazłem tego płatnika w bazie danych.', 404);
        return next(error);
    }

    const invoicesAndRates = student.financialRates.concat(student.invoices);
    let documentToPay;
    for (let doc of invoicesAndRates) {
        if (doc.id === documentId) {
            documentToPay = doc
        }
    }

    const dataToHash = JSON.stringify({
        "sessionId": documentToPay.id.toString(),
        "merchantId": +process.env.MERCHANTID,
        "amount": +((documentToPay.documentBalance || documentToPay.invoiceBalance) * 100).toFixed(0),
        "currency": "PLN",
        "crc": process.env.PRZELEWY24_CRC
    });

    const sha384 = crypto.createHash('sha384');
    const sign = sha384.update(dataToHash).digest('hex');

    const data = {
        "merchantId": +process.env.MERCHANTID,
        "posId": +process.env.MERCHANTID,
        "sessionId": documentToPay.id.toString(),
        "amount": +((documentToPay.documentBalance || documentToPay.invoiceBalance) * 100).toFixed(0),
        "currency": "PLN",
        "description": documentToPay.originalname || documentToPay.documentName,
        "email": student.email,
        "country": "PL",
        "language": "pl",
        "urlReturn": process.env.COMPANY_REGISTER_URL + 'client/' + student.id,
        "urlStatus": process.env.MY_BACKEND_URL + 'payments/przelewy24/payment-confirmation',
        "timeLimit": 0,
        "waitForResult": false,
        "sign": sign,
    }

    const createdPrzelewy24Payment = new PayWithPrzelewy24Payment({
        id: random_UUID(),
        paymentData: data,
        paymantDate: new Date().toISOString(),
        student
    });

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPrzelewy24Payment.save({ session: sess });
        student.przelewy24Payments.push(createdPrzelewy24Payment);
        await student.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('Nie udało mi się zapisać tej transakcji w bazie danych.', 500);
        return next(error);
    }

    let response;
    try {
        response = await axios.post('https://secure.przelewy24.pl/api/v1/transaction/register',
            data, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic " + process.env.PRZELEWY24_API,
                "cache-control": "no-cache",
                "crossDomain": true
            },
        });
    } catch (err) {
        const error = new HttpError(`Nie udało mi się pobrać token. Błąd ${err.response.data.code}.`, 500);
        return next(error);
    }

    //  invoice status change from issiued to prcessing

    // let paidDocumentType;
    // for (let doc of student.invoices) {
    //     if (doc.id === documentId) {
    //         paidDocumentType = 'invoices';
    //     }
    // }
    // for (let doc of student.financialRates) {
    //     if (doc.id === documentId) {
    //         paidDocumentType = 'financialRates';
    //     }
    // }

    // let updtatedFinancialDocuments = student[paidDocumentType];

    // let updatedDocument;

    // for (let doc of updtatedFinancialDocuments) {
    //     if (doc.id === documentId) {
    //         updatedDocument = doc;
    //         if (paidDocumentType === 'invoices') {
    //             updatedDocument.invoiceStatus = 'Przetwarzana';
    //         }
    //         if (paidDocumentType === 'financialRates') {
    //             updatedDocument.documentStatus = 'Przetwarzana';
    //         }

    //         const index = updtatedFinancialDocuments.findIndex(doc => doc.id === documentId);
    //         updtatedFinancialDocuments.splice(index, 1, updatedDocument);
    //     }
    // }

    // student[paidDocumentType] = updtatedFinancialDocuments;

    // try {
    //     await student.save();
    // } catch (err) {
    //     const error = new HttpError('Nie udało mi się zapisać w bazie danych zmiany statusu tej transakcji.', 500);
    //     return next(error);
    // }


    //end



    res.status(200).json({ token: response.data.data.token });
}


const paymentConfirmation = async (req, res, next) => {

    const dataToHash = JSON.stringify({
        "sessionId": req.body.sessionId,
        "orderId": req.body.orderId,
        "amount": req.body.amount,
        "currency": req.body.currency,
        "crc": process.env.PRZELEWY24_CRC
    });

    const sha384 = crypto.createHash('sha384');
    const sign = sha384.update(dataToHash).digest('hex');

    const data = {
        "merchantId": req.body.merchantId,
        "posId": req.body.posId,
        "sessionId": req.body.sessionId,
        "amount": req.body.amount,
        "currency": req.body.currency,
        "orderId": req.body.orderId,
        "sign": sign
    }

    let response;
    try {
        response = await axios.put("https://secure.przelewy24.pl/api/v1/transaction/verify",
            data, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic " + process.env.PRZELEWY24_API,
                "cache-control": "no-cache",
                "crossDomain": true
            },
        });
    } catch (err) {
        const error = new HttpError('Nie udało mi się potwierdzić tej płatności.', 500);
        return next(error);
    }

    if (response.data.data.status === 'success') {

        let student;
        try {
            student = await Student.findOne({ financialRates: { $elemMatch: { id: req.body.sessionId } } });
        } catch (err) {
            const error = new HttpError('Nie udało mi się pobrać dokumentu finansowego.', 500);
            return next(error);
        }


        if (!student || student.length === 0) {
            try {
                student = await Student.findOne({ invoices: { $elemMatch: { id: req.body.sessionId } } })
            } catch (err) {
                const error = new HttpError('Nie udało mi się pobrać dokumentu finansowego.', 500);
                return next(error);
            }
        }

        if (!student || student.length === 0) {
            const error = new HttpError('Nie znalazłem tego płacącego w bazie danych.', 404);
            return next(error);
        }

        let paidDocumentType;
        for (let doc of student.invoices) {
            if (doc.id === req.body.sessionId) {
                paidDocumentType = 'invoices';
            }
        }
        for (let doc of student.financialRates) {
            if (doc.id === req.body.sessionId) {
                paidDocumentType = 'financialRates';
            }
        }

        let updtatedFinancialDocuments = student[paidDocumentType];
        let updatedDocument;

        for (let doc of updtatedFinancialDocuments) {
            if (doc.id === req.body.sessionId) {
                updatedDocument = doc;
                if (paidDocumentType === 'invoices') {
                    updatedDocument.invoiceStatus = 'paid';
                }
                if (paidDocumentType === 'financialRates') {
                    updatedDocument.documentStatus = 'paid';
                }

                const index = updtatedFinancialDocuments.findIndex(doc => doc.id === req.body.sessionId);
                updtatedFinancialDocuments.splice(index, 1, updatedDocument);
            }
        }

        student[paidDocumentType] = updtatedFinancialDocuments;

        try {
            await student.save();
        } catch (err) {
            const error = new HttpError('Nie udało mi się zapisać w bazie danych zmiany statusu tej transakcji.', 500);
            return next(error);
        }
    }
}


exports.getPayments = getPayments;
exports.payWithPrzelewy24 = payWithPrzelewy24;
exports.paymentConfirmation = paymentConfirmation;