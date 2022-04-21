const express = require('express');


const certificateControllers = require('../controllers/certificate-controllers');

const router = express.Router();


// router.get('/:userType/:id', statisticsControllers.getOneStatistcsObject);

// router.get('/:userType/:id/:startDate/:endDate', statisticsControllers.getOneStatistcsObjectByDate);

router.get('/:studentId/:groupId', certificateControllers.getCertificatePDF);

module.exports = router;