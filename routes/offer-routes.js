const express = require('express');
const { check } = require('express-validator');

const offerControllers = require('../controllers/offer-controllers');

const router = express.Router();


router.get('/', offerControllers.getCourses);

router.get('/:type', offerControllers.getCoursesByType);

router.post('/',
    [
        check('courseType')
            .not()
            .isEmpty(),
        check('courseTitle')
            .isLength({ min: 5 }),
        check('coursePrice')
            .isNumeric(),
        check('courseDesc')
            .isLength({ min: 10 }),
        check('courseTerms')
            .isLength({ min: 5 }),
        check('courseForWho')
            .isLength({ min: 5 }),
    ],
    offerControllers.createCourse);

router.patch('/:id', [
    check('courseType')
        .not()
        .isEmpty(),
    check('courseTitle')
        .isLength({ min: 5 }),
    check('coursePrice')
        .isNumeric(),
    check('courseDesc')
        .isLength({ min: 10 }),
], offerControllers.updateCourse);

router.delete('/:id', offerControllers.deleteCourse);


module.exports = router;