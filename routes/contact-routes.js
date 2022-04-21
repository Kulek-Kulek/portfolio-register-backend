const express = require('express');
const { check } = require('express-validator');

const contactControllers = require('../controllers/contact-controllers');

const router = express.Router();


router.post('/', [
    check('contactName')
        .not()
        .isEmpty(),
    check('contactEmail')
        .isEmail(),
    check('contactComment')
        .isLength({ min: 1 }),
    check('contactMobile')
        .isNumeric()
        .isLength({ min: 6 }),
],
    contactControllers.createContact);

router.post('/maria-lp',
    contactControllers.createContactMariaLp);

router.post('/okayProjects',
    contactControllers.createContactOkayProjectsLandingPage);



module.exports = router;