const Files = require('../models/files');


const getGeneralDocuments = async (req, res, next) => {

    let documents;
    try {
        documents = await Files.find();
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać listy dokumentów.', 500);
        return next(error);
    }
    if (!documents || documents.length === 0) {
        const error = new HttpError('Nie masz żadnych dokumentów w bazie danych.', 404);
        return next(error);
    }

    res.status(200).json({ documents: documents.map(document => document.toObject({ getters: true })) });
}

exports.getGeneralDocuments = getGeneralDocuments;
