const express = require('express');
const { check } = require('express-validator');

const groupControllers = require('../controllers/group-controllers');

const router = express.Router();


router.get('/:data', groupControllers.getGroups);


router.get('/group/:groupId', groupControllers.getOneGroup);

router.post('/create-group', [
    check('name')
        .not()
        .isEmpty(),
    check('lessonLength')
        .isNumeric()
        .isLength({ min: 2 }),
    check('courseLength')
        .isNumeric()
        .isLength({ min: 1 }),
    check('groupLevel')
        .not()
        .isEmpty(),
    check('certificateType')
        .not()
        .isEmpty(),
    check('schoolYear')
        .not()
        .isEmpty(),
    check('courseName')
        .not()
        .isEmpty(),
    check('lessonDayTime')
        .isArray({ min: 1 })
],
    groupControllers.createGroup);

router.post('/:id',
    groupControllers.addToGroup);

router.patch('/:groupId', [
    check('name')
        .not()
        .isEmpty(),
    check('lessonLength')
        .isNumeric()
        .isLength({ min: 2 }),
    check('courseLength')
        .isNumeric()
        .isLength({ min: 1 }),
    check('groupLevel')
        .not()
        .isEmpty(),
    check('certificateType')
        .not()
        .isEmpty(),
    check('schoolYear')
        .not()
        .isEmpty(),
    check('courseName')
        .not()
        .isEmpty(),
    check('lessonDayTime')
        .isArray({ min: 1 })
],
    groupControllers.updateGroup);


router.post('/recreate-group/:groupId',
    groupControllers.recreateGroup);

router.delete('/:id', groupControllers.deleteGroup);

router.patch('/remove-from-group/:id', groupControllers.deleteDataFromGroup);



module.exports = router;