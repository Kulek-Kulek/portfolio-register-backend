const PorfolioProject = require('../models/portfolioProjects');
const HttpError = require('../models/http-error');

const getPortfolioProjects = async (req, res, next) => {

    let projects;
    try {
        projects = await PorfolioProject.find();
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać listy projektów', 500);
        return next(error);
    }

    if (!projects || projects.length === 0) {
        const error = new HttpError('Nie znalazłem żadnych projektów w bazie danych.', 404);
        return next(error);
    }

    res.json({ projects: projects.map(project => project.toObject({ getters: true })) });
};


exports.getPortfolioProjects = getPortfolioProjects;