const express = require('express');
const { check } = require('express-validator');

const loginSupervisorControllers = require('../controllers/loginSupervisor-controller');


const router = express.Router();


router.post('/', [
    check('supervisorEmail')
        .isEmail(),
    check('studentEmail')
        .isEmail(),
    check('supervisorPassword')
        .isLength({ min: 8 }),
    check('supervisor').isBoolean()
], loginSupervisorControllers.loginSupervisor);


router.post('/password-reset-parent', [
    check('email')
        .isEmail()
], loginSupervisorControllers.passwordResetSupervisor);

router.get('/password-reset/:token', loginSupervisorControllers.getSupervisorUpdatingPassword);

router.post('/password-reset/:token', [
    check('updatedPassword')
        .isLength(8),
    check('userId')
        .isArray({ min: 1 })
], loginSupervisorControllers.updateSupervisorPassword);


module.exports = router;