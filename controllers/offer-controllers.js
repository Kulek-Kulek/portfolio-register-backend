const { v1: uuid } = require('uuid');
const { validationResult } = require('express-validator');

const HttpError = require('../models/http-error');
const Course = require('../models/course');


const getCourses = async (req, res, next) => {
    let courses;
    try {
        courses = await Course.find()
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać listy kursów.', 500);
        return next(error);
    }
    if (!courses || courses.length === 0) {
        const error = new HttpError('Nie masz żadnych kursów w bazie danych.', 404);
        return next(error);
    }
    res.status(200).json({ courses: courses.map(course => course.toObject({ getters: true })) });
}

const getCoursesByType = async (req, res, next) => {

    const courseType = req.params.type;

    let courses;
    try {
        courses = await Course.find({ courseType });
    } catch (err) {
        const error = new HttpError('Upss, coś poszło nie tak.', 500);
        return next(error);
    }

    if (!courses || courses.length === 0) {
        const error = new HttpError('Nie znalazłem żadnych kursów.', 404);
        return next(error);
    }

    res.json({ courses: courses.map(course => course.toObject({ getters: true })) });
};


const createCourse = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { courseType, courseTitle, coursePrice, courseDesc, courseForWho, courseAdvgs, courseTerms } = req.body;

    const createdCourse = new Course({
        id: uuid(),
        courseType,
        courseTitle,
        coursePrice,
        courseDesc,
        courseForWho,
        courseAdvgs: courseAdvgs || [],
        courseTerms
    });

    try {
        await createdCourse.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się stworzyć tego kursu.', 500);
        return next(error);
    }

    res.status(201)
        .json({ course: createdCourse });
};


const updateCourse = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Wprowadziłeś niepoprawne dane.', 422));
    }

    const { courseType, courseTitle, coursePrice, courseDesc, courseForWho, courseAdvgs, courseTerms } = req.body;
    const courseId = req.params.id;

    let course;
    try {
        course = await Course.findById(courseId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znależć tego kursu.', 500);
        return next(error);
    }

    course.courseType = courseType;
    course.courseTitle = courseTitle;
    course.coursePrice = coursePrice;
    course.courseDesc = courseDesc;
    course.courseForWho = courseForWho;
    course.courseAdvgs = courseAdvgs;
    course.courseTerms = courseTerms;

    try {
        await course.save();
    } catch (err) {
        const error = new HttpError('Nie udało mi się zapisać tego kursu w bazie danych po aktualizacji.', 500);
        return next(error);
    }

    res.status(200).json({ course: course.toObject({ getters: true }) });
};



const deleteCourse = async (req, res, next) => {
    const courseId = req.params.id;

    let course;
    try {
        course = await Course.findById(courseId);
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tego kursu, żeby go usunąć.', 500);
        return next(error);
    }

    try {
        await course.remove();
    } catch (err) {
        const error = new HttpError('Nie udało mi się usunąć tego kursu.', 500);
        return next(error);
    }

    res.status(200).json({ message: 'Kurs usunięty.' });
};


exports.getCourses = getCourses;
exports.getCoursesByType = getCoursesByType;
exports.createCourse = createCourse;
exports.updateCourse = updateCourse;
exports.deleteCourse = deleteCourse;