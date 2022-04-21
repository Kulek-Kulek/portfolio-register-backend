const express = require('express');
const { check } = require('express-validator');

const adminControllers = require('../controllers/admin-controllers');


const router = express.Router();


router.post('/create-admin', [
    check('email')
        .normalizeEmail()
        .isEmail(),
    check('password')
        .isLength({ min: 1 }),
    check('name')
        .isLength({ min: 1 }),
    check('surname')
        .isLength({ min: 1 }),
    check('name')
        .isLength({ min: 1 }),
    check('mobile')
        .isLength({ min: 1 }),
], adminControllers.createHeadTeacher);


module.exports = router;