const express = require('express');

const paymentsControllers = require('../controllers/payments-controllers');


const router = express.Router();

router.get('/', paymentsControllers.getPayments);

router.get('/przelewy24/:studentId/:documentId', paymentsControllers.payWithPrzelewy24);

router.post('/przelewy24/payment-confirmation', paymentsControllers.paymentConfirmation);


module.exports = router;