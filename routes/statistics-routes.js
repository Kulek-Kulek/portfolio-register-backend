const express = require('express');


const statisticsControllers = require('../controllers/statistic-controllers');

const router = express.Router();


router.get('/:userType/:id', statisticsControllers.getOneStatistcsObject);

router.get('/:userType/:id/:startDate/:endDate', statisticsControllers.getOneStatistcsObjectByDate);

router.get('/download-report', statisticsControllers.getPDFReport);

module.exports = router;