const express = require('express');
const { check } = require('express-validator');

const settingsControllers = require('../controllers/setting-controllers');

const router = express.Router();



router.get('/', settingsControllers.getSettings);


router.post('/schoolyear', [
    check('schoolYearStart')
        .isISO8601().toDate(),
    check('firstTermEnd')
        .isISO8601().toDate(),
    check('schoolYearEnd')
        .isISO8601().toDate(),
],
    settingsControllers.setSchoolYearSchedlue);


router.post('/bankaccount',
    //  [
    //     check('setBankAccount')
    //         .isNumeric()
    //         .isLength({ min: 26 })
    //         .isLength({ max: 26 })
    //     ,
    // ],
    settingsControllers.setBankAccount);


router.post('/rodo', [
    check('rodoName')
        .not()
        .isEmpty(),
    check('rodoText')
        .not()
        .isEmpty(),
],
    settingsControllers.setRodo);


router.post('/course', [
    check('newCourseTitle')
        .not()
        .isEmpty(),
    check('newCourseLength')
        .not()
        .isEmpty()
        .isNumeric(),
    check('newCoursePrice')
        .not()
        .isEmpty()
        .isNumeric(),
    check('newCourseDesc')
        .not()
        .isEmpty(),
],
    settingsControllers.setCourse);


router.post('/internal-message', [
    check('internalMessage')
        .not()
        .isEmpty(),
    check('firstInternalMessageDay')
        .not()
        .isEmpty(),
    check('lastInternalMessageDay')
        .not()
        .isEmpty(),
    check('messageToStudents')
        .not()
        .isEmpty(),
    check('messageToTeachers')
        .not()
        .isEmpty()
],
    settingsControllers.setInternalMessage);


router.delete('/:settingType/:id', settingsControllers.deleteSettingType);


module.exports = router;