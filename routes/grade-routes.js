const express = require('express');
const { check } = require('express-validator');

const gradeControllers = require('../controllers/grade-controllers');

const router = express.Router();

// router.get('/', gradeControllers.getGrades);



router.post('/create-grade',
    [
        check('grades')
            .not()
            .isEmpty(),
        check('teacherId')
            .not()
            .isEmpty()
    ],
    gradeControllers.createGrade);

router.patch('/:gradeId/:studentId',
    check('updatedGrade')
        .isNumeric()
        .isLength(1),
    gradeControllers.updateGrade);

router.delete('/:id', gradeControllers.deleteGrade);

module.exports = router;