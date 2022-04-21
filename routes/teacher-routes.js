const express = require('express');
const { check } = require('express-validator');

const teacherControllers = require('../controllers/teacher-controllers');

const fileUpload = require('../middlewere/file-upload');

const router = express.Router();


router.get('/:data', teacherControllers.getTeachers);


router.get('/teacher/:teacherId', teacherControllers.getOneTeacher);

router.get('/groupsBy/:teacherId', teacherControllers.getTeacherGroups);

router.post('/create-teacher',
    [
        check('name')
            .not()
            .isEmpty(),
        check('surname')
            .not()
            .isEmpty(),
        check('mobile')
            .isNumeric()
            .isLength({ min: 6 }),
        check('email')
            .isEmail(),
        check('password')
            .isLength({ min: 6 })
    ],
    teacherControllers.createTeacher);


router.post('/', fileUpload.single('image'), teacherControllers.uploadTeacherImage);


router.patch('/:id', fileUpload.single('uploadedFile'),
    [
        check('name')
            .not()
            .isEmpty(),
        check('surname')
            .not()
            .isEmpty(),
        check('mobile')
            .isNumeric()
            .isLength({ min: 6 }),
        check('email')
            .isEmail()
    ],
    teacherControllers.updateTeacher);

router.delete('/:id', teacherControllers.deleteTeacher);



module.exports = router;