const express = require('express');

const generalDocuments = require('../controllers/generalDocuments-controllers');

const router = express.Router();


router.get('/', generalDocuments.getGeneralDocuments);

module.exports = router;