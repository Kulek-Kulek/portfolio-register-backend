const express = require('express');
const { check } = require('express-validator');

const loginControllers = require('../controllers/login-controller');


const router = express.Router();


router.post('/', [
    check('email')
        .isEmail(),
    check('password')
        .isLength({ min: 8 })
], loginControllers.loginUser);


router.post('/password-reset', [
    check('email')
        .isEmail()
], loginControllers.passwordReset);

router.get('/password-reset/:token', loginControllers.getUserUpdatingPassword);

router.post('/password-reset/:token', [
    check('updatedPassword')
        .isLength(8),
    check('userId')
        .not()
        .isEmpty()
], loginControllers.updatePassword);


module.exports = router;