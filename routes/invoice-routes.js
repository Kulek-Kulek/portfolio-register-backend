const express = require('express');

const invoiceControllers = require('../controllers/invoice-controllers');
const isAuth = require('../middlewere/check-auth');

const router = express.Router();

router.get('/:invoiceKey', invoiceControllers.getInvoice);

module.exports = router;