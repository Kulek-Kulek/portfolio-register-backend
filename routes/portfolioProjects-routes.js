const express = require('express');

const portfolioProjectsControllers = require('../controllers/portfolioProjects-controllers');

const router = express.Router();

router.get('/', portfolioProjectsControllers.getPortfolioProjects);

module.exports = router;