const express = require('express');
const { check } = require('express-validator');

const sendEmailControllers = require('../controllers/sendEmail-controllers');
const router = express.Router();


router.post('/', [
    check('subject')
        .isLength({ min: 3 }),
    check('text')
        .isLength({ min: 3 }),
    check('sender')
        .not()
        .isEmpty(),
    check('recipients')
        .isArray(),
], sendEmailControllers.sendEmailMessage);



module.exports = router;