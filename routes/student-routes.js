const express = require('express');
const { check } = require('express-validator');


const studentControllers = require('../controllers/student-controllers');

const fileUpload = require('../middlewere/file-upload');

const router = express.Router();


router.get('/:data', studentControllers.getStudents);
router.get('/change/change/data', studentControllers.archiveStudents);

router.get('/student/:studentId', studentControllers.getOneStudent);

router.post('/signup',
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
            .isLength({ min: 8 }),
        check('invoiceData')
            .not()
            .isEmpty(),
    ],
    studentControllers.signup);

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
    studentControllers.updateStudent);


router.post('/:id',
    [
        check('endStudentTermGrade')
            .not()
            .isEmpty()
    ],
    studentControllers.createStudentEndTermGrade);


router.post('/', fileUpload.single('image'), studentControllers.uploadStudentImage);

router.delete('/:studentId/:documentId', studentControllers.deleteFinancialDocument);

router.delete('/:id', studentControllers.deleteStudent);



module.exports = router;