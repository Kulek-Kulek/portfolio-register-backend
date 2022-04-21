const express = require('express');
const { check } = require('express-validator');

const orderControllers = require('../controllers/order-controllers');
const router = express.Router();


router.get('/', orderControllers.getOrders);

router.post('/', [
    check('name')
        .isLength({ min: 3 }),
    check('surname')
        .isLength({ min: 3 }),
    check('mobile')
        .isNumeric()
        .isLength({ min: 6 }),
    check('email')
        .isEmail(),
    check('lessonType')
        .not()
        .isEmpty(),
    check('birthday')
        .not()
        .isEmpty(),
    check('courseName')
        .not()
        .isEmpty(),
    check('coursePrice')
        .not()
        .isEmpty(),
    check('courseRules')
        .not()
        .isEmpty()
        .isBoolean()
], orderControllers.addOrder);




module.exports = router;