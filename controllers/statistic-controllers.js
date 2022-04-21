const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const removeAccents = require('../Utility/accents');
const downloadPolishFontsFromAWS = require('../Utility/downloadFontsFromAWS');
const downloadDocumentFromAWS = require('../Utility/downloadDocumentFromAWS');
const HttpError = require('../models/http-error');
const Student = require('../models/student');
const Group = require('../models/group');
const Teacher = require('../models/teacher');
const Settings = require('../models/setting');


let groupName;

const getOneStatistcsObject = async (req, res, next) => {

    const userType = req.params.userType;
    const id = req.params.id;

    let settings;
    try {
        settings = await Settings.find();
    } catch (err) {
        console.log(err);
    }
    if (!settings || settings.length === 0) {
        console.log('Nie pobrałem ustawień apliakcji.');
    }

    const schoolYearStart = new Date(settings[0].schoolYearSchedlue.schoolYearStart);

    const startDateDay = schoolYearStart.getDate();
    const startDateMonth = schoolYearStart.getMonth();
    const startDateYear = schoolYearStart.getFullYear();



    // const userType = userTypeFromParams.charAt(0).toUpperCase() + userTypeFromParams.slice(1);


    // Polish Regular Fonts download from AWS    
    // const regularFontsPath = path.join('public', 'downloads', 'fonts', 'Cantarell-Regular.ttf');

    // const s3RegularFonts = new AWS.S3({
    //     accessKeyId: process.env.ACCESS_KEY_ID,
    //     secretAccessKey: process.env.SECRET_ACCESS_KEY,
    //     region: process.env.REGION
    // });

    // const paramsRegularFonts = {
    //     Bucket: process.env.BUCKET_NAME,
    //     Key: 'Cantarell-Regular.ttf'
    // };
    // const fileStreamRegularFonts = fs.createWriteStream(regularFontsPath);
    // const s3StreamRegularFonts = s3RegularFonts.getObject(paramsRegularFonts).createReadStream();

    // s3StreamRegularFonts.on('error', function (err) {
    //     console.error(err);
    // });

    // s3StreamRegularFonts.pipe(fileStreamRegularFonts).on('error', (err) => {
    //     console.error('File Stream:', err);
    // }).on('close', () => {
    //     fs.createReadStream(regularFontsPath);
    // });

    // Polish Bold Fonts download from AWS    



    // const boldFontsPath = path.join('public', 'downloads', 'fonts', 'Cantarell-Bold.ttf');

    // const s3BoldFonts = new AWS.S3({
    //     accessKeyId: process.env.ACCESS_KEY_ID,
    //     secretAccessKey: process.env.SECRET_ACCESS_KEY,
    //     region: process.env.REGION
    // });

    // const paramsBoldFonts = {
    //     Bucket: process.env.BUCKET_NAME,
    //     Key: 'Cantarell-Bold.ttf'
    // };
    // const fileStreamBoldFonts = fs.createWriteStream(boldFontsPath);
    // const s3StreamBoldFonts = s3BoldFonts.getObject(paramsBoldFonts).createReadStream();

    // s3StreamBoldFonts.on('error', function (err) {
    //     console.error(err);
    // });

    // s3StreamRegularFonts.pipe(fileStreamBoldFonts).on('error', (err) => {
    //     console.error('File Stream:', err);
    // }).on('close', () => {
    //     fs.createReadStream(regularFontsPath);
    // });

    downloadPolishFontsFromAWS('Cantarell-Bold.ttf');
    downloadPolishFontsFromAWS('Cantarell-Regular.ttf');
    let modelType;

    switch (userType) {
        case 'student':
            modelType = Student.findById(id, '-status -password')
                .populate('courses topics group')
                .populate({ path: 'group', match: { archive: false }, populate: { path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay) } } } })
                .populate({ path: 'grades', populate: { path: 'createdBy', select: '-password -status -passwordResetToken -passwordResetTokenExpiration' } })
                .populate({ path: 'group', match: { archive: false }, populate: { path: 'teacher', select: '-password -status -passwordResetToken -passwordResetTokenExpiration' } });
            break;
        case 'group':
            modelType = Group.findById(id)
                .populate('topics teacher grades')
                .populate({ path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay) } }, populate: { path: 'absentStudents', select: '-password -status' } })
                .populate({ path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay) } }, populate: { path: 'presentStudents', select: '-password -status' } })
                .populate({ path: 'students', match: { archive: false }, select: '-password -status', populate: { path: 'grades', populate: { path: 'createdBy', select: '-password -status -passwordResetToken -passwordResetTokenExpiration' } } })
                .populate({ path: 'students', match: { archive: false }, select: '-password -status', populate: { path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay) } }, populate: { path: 'absentStudents', select: '-password -status' } } })
                .populate({ path: 'students', match: { archive: false }, select: '-password -status', populate: { path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay) } }, populate: { path: 'presentStudents', select: '-password -status' } } });
            break;
        case 'teacher':
            modelType = Teacher.findById(id, '-status -password')
                .populate('topics group grades teacher pastGroup')
                .populate({ path: 'group', match: { archive: false }, populate: { path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay) } } } })
                .populate({ path: 'pastGroup', populate: { path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay) } } } })
                .populate({ path: 'pastGroup', populate: { path: 'students' } })
                .populate({ path: 'group', match: { archive: false }, populate: { path: 'students', match: { archive: false }, select: '-password -status' } });
            break;
        default: modelType = Teacher.findById(id, '-status -password')
            .populate('topics group');
            break;
    }


    let statisticsRawData;
    try {
        statisticsRawData = await modelType;
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać danych statystycznych.', 500);
        return next(error);
    }

    if (!statisticsRawData || statisticsRawData.length === 0) {
        const error = new HttpError('Nie znalazłem danych statystycznych dla tego zapytania.', 404);
        return next(error);
    }



    if (userType === 'group') {
        groupName = removeAccents(statisticsRawData.name);

        const PDFDocument = require('pdfkit');
        const pdfPath = path.join('public', 'downloads', 'reports', 'Raport' + ' ' + groupName + '.pdf');
        const pdfDoc = new PDFDocument();

        const day = new Date().getDate().toString().length === 2 ? new Date().getDate() : '0' + new Date().getDate();
        const month = (new Date().getMonth() + 1).toString().length === 2 ? new Date().getMonth() + 1 : '0' + (new Date().getMonth() + 1);
        const year = new Date().getFullYear();

        const pdfDocHeader = () => {
            pdfDoc
                .image('public/downloads/images/logo.jpeg', 220, 0, { width: 200, height: 100 }).moveDown(3)
                .fontSize(12)
                .font('PolishFontRegular')
                .text('Raport nauczania dla grupy ', { continued: true, underline: true })
                .font('PolishFontBold')
                .text(statisticsRawData.name)
                .moveDown()
                .fontSize(11)
                .text('Liczba godzin: ' + statisticsRawData.topics.length + ' / ' + statisticsRawData.lessonLength + ' ' + 'minut', { continued: true })
                .fontSize(10)
                .text(`Od początku roku szkolnego do ${day + '.' + month + '.' + year}r.`, { align: 'right' }).moveDown(0.2)
                .text(`Lektor: ${statisticsRawData.teacher[0] ? statisticsRawData.teacher[0].name + '  ' + statisticsRawData.teacher[0].surname : 'Brak danych'}`).moveDown(1.5);
        }

        let presentDates = [];
        const presentStudentDates = (studentId) => {
            for (let topics of statisticsRawData.topics) {
                for (let presentStudents of topics.presentStudents) {
                    if (presentStudents.id === studentId) {
                        let day = new Date(topics.lessonDate).getDate().toString().length === 2 ? new Date(topics.lessonDate).getDate() : '0' + new Date(topics.lessonDate).getDate();
                        let month = (new Date(topics.lessonDate).getMonth() + 1).toString().length === 2 ? new Date(topics.lessonDate).getMonth() + 1 : '0' + (new Date(topics.lessonDate).getMonth() + 1);
                        let year = new Date(topics.lessonDate).getFullYear();

                        presentDates.push(day + '.' + month + '.' + year);
                    }
                }
            }
        }

        let absentDates = [];
        const absentStudentDates = (studentId) => {
            for (let topics of statisticsRawData.topics) {
                for (let absentStudents of topics.absentStudents) {
                    if (absentStudents.id === studentId) {
                        let day = new Date(topics.lessonDate).getDate().toString().length === 2 ? new Date(topics.lessonDate).getDate() : '0' + new Date(topics.lessonDate).getDate();
                        let month = (new Date(topics.lessonDate).getMonth() + 1).toString().length === 2 ? new Date(topics.lessonDate).getMonth() + 1 : '0' + (new Date(topics.lessonDate).getMonth() + 1);
                        let year = new Date(topics.lessonDate).getFullYear();

                        absentDates.push(day + '.' + month + '.' + year);
                    }
                }
            }
        }

        const pdfDocStudents = () => {
            pdfDoc
                .font('PolishFontBold')
                .fontSize(12)
                .text('Lista słuchaczy')
                .moveDown(0.5)
            for (let student of statisticsRawData.students) {
                presentStudentDates(student.id);
                absentStudentDates(student.id);
                pdfDoc
                    .underline(60, pdfDoc.y + 15, 520, 1, { color: 'black' })
                    .fontSize(10)
                    .font('PolishFontBold')
                    .text(student.name + ' ' + student.surname, 70).moveDown(.3)
                    .text('Obecność:').moveUp()
                    .font('PolishFontRegular')
                    .fontSize(9)
                    .text(presentDates.map(date => ' ' + date), 150)
                    .font('PolishFontBold')
                absentDates.length === 0 ?
                    pdfDoc
                        .fontSize(10)
                        .text('Nieobecność:', 70)
                        .moveDown(1.5) :
                    pdfDoc.text('Nieobecność:', 70)
                        .moveUp()
                        .font('PolishFontRegular')
                        .fontSize(9)
                        .text(absentDates.map(date => ' ' + date), 150)
                        .moveDown(2)
                presentDates = [];
                absentDates = [];
            }
        }



        const pdfDocTopics = () => {
            let index = 1;
            pdfDoc.font('PolishFontBold').moveDown(2)
                .fontSize(10)
                .underline(60, pdfDoc.y - 5, 520, 1, { color: 'black' })
                .underline(60, pdfDoc.y + 20, 520, 1, { color: 'black' })
                .text('Lp', 67).moveUp()
                .text('Data', 112).moveUp()
                .text('Temat zajęć', { align: 'center' }).moveUp()
                .moveDown()
            for (let topic of statisticsRawData.topics) {

                let day = new Date(topic.lessonDate).getDate().toString().length === 2 ? new Date(topic.lessonDate).getDate() : '0' + new Date(topic.lessonDate).getDate();
                let month = (new Date(topic.lessonDate).getMonth() + 1).toString().length === 2 ? new Date(topic.lessonDate).getMonth() + 1 : '0' + (new Date(topic.lessonDate).getMonth() + 1);
                let year = new Date(topic.lessonDate).getFullYear();

                pdfDoc
                    .moveDown()
                    .fontSize(10)
                    .font('PolishFontRegular')
                    .text(index, 70).moveUp()
                    .text(day + '.' + month + '.' + year, 100).moveUp()
                    .text(topic.topic, 200).moveUp()
                    .moveDown(0.3)
                index++;;
            }
            pdfDoc.moveDown()
        }

        const generatePDFFile = () => {
            pdfDoc.pipe(fs.createWriteStream(pdfPath));
            pdfDoc.registerFont('PolishFontRegular', 'public/downloads/fonts/Cantarell-Regular.ttf');
            pdfDoc.registerFont('PolishFontBold', 'public/downloads/fonts/Cantarell-Bold.ttf');
            pdfDocHeader();
            pdfDocStudents();
            pdfDocTopics();
            pdfDoc
                .fontSize(8)
                .font('PolishFontRegular')
                .text(`Koniec dokumentu. Wygenerowano ${day + '.' + month + '.' + year}`, 60)
            pdfDoc.end();
        }
        // const imagePath = path.join('public', 'downloads', 'images', 'logo.jpeg');
        // const s3 = new AWS.S3({
        //     accessKeyId: process.env.ACCESS_KEY_ID,
        //     secretAccessKey: process.env.SECRET_ACCESS_KEY,
        //     region: process.env.REGION
        // });

        // const params = {
        //     Bucket: process.env.BUCKET_NAME,
        //     Key: 'logo.jpeg'
        // };
        // const fileStream = fs.createWriteStream(imagePath);
        // const s3Stream = s3.getObject(params).createReadStream();

        // s3Stream.on('error', function (err) {
        //     console.error(err);
        // });

        // s3Stream.pipe(fileStream).on('error', (err) => {
        //     console.error('File Stream:', err);
        // }).on('close', () => {
        //     fs.createReadStream(imagePath);
        //     generatePDFFile();
        // });
        downloadDocumentFromAWS('logo.jpeg', generatePDFFile);
    }


    res.json({ statisticsRawData: statisticsRawData.toObject({ getters: true }) });
};


const getOneStatistcsObjectByDate = async (req, res, next) => {

    const userType = req.params.userType;
    const id = req.params.id;
    const startDate = new Date(req.params.startDate);
    const endDate = new Date(req.params.endDate);

    const startDateDay = startDate.getDate();
    const startDateMonth = startDate.getMonth();
    const startDateYear = startDate.getFullYear();

    const endDateDay = endDate.getDate();
    const endDateMonth = endDate.getMonth();
    const endDateYear = endDate.getFullYear();

    let modelType;
    let statisticsRawData;
    switch (userType) {
        case 'student':
            modelType = Student.findById(id, '-status -password')
                .populate('courses topics group')
                .populate({ path: 'group', match: { archive: false }, populate: { path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay), $lte: new Date(endDateYear, endDateMonth, endDateDay) } } } })
                .populate({ path: 'grades', populate: { path: 'createdBy', select: '-password -status -passwordResetToken -passwordResetTokenExpiration' } })
                .populate({ path: 'group', match: { archive: false }, populate: { path: 'teacher', select: '-password -status -passwordResetToken -passwordResetTokenExpiration' } });
            break;
        case 'group':
            modelType = Group.findById(id)
                .populate('topics teacher grades')
                .populate({ path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay), $lte: new Date(endDateYear, endDateMonth, endDateDay) } }, populate: { path: 'absentStudents', select: '-password -status' } })
                .populate({ path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay), $lte: new Date(endDateYear, endDateMonth, endDateDay) } }, populate: { path: 'presentStudents', select: '-password -status' } })
                .populate({ path: 'students', match: { archive: false }, select: '-password -status', populate: { path: 'grades', populate: { path: 'createdBy', select: '-password -status -passwordResetToken -passwordResetTokenExpiration' } } })
                .populate({ path: 'students', match: { archive: false }, select: '-password -status', populate: { path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay), $lte: new Date(endDateYear, endDateMonth, endDateDay) } }, populate: { path: 'absentStudents', select: '-password -status' } } })
                .populate({ path: 'students', match: { archive: false }, select: '-password -status', populate: { path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay), $lte: new Date(endDateYear, endDateMonth, endDateDay) } }, populate: { path: 'presentStudents', select: '-password -status' } } });
            break;
        case 'teacher':
            modelType = Teacher.findById(id, '-status -password')
                .populate('topics group grades teacher pastGroup')
                .populate({ path: 'group', match: { archive: false }, populate: { path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay), $lte: new Date(endDateYear, endDateMonth, endDateDay) } } } })
                .populate({ path: 'pastGroup', populate: { path: 'topics', match: { lessonDate: { $gte: new Date(startDateYear, startDateMonth, startDateDay), $lte: new Date(endDateYear, endDateMonth, endDateDay) } } } })
                .populate({ path: 'pastGroup', populate: { path: 'students' } })
                .populate({ path: 'group', match: { archive: false }, populate: { path: 'students', match: { archive: false }, select: '-password -status' } });
            break;
        default: modelType = Teacher.findById(id, '-status -password')
            .populate('topics group');
            break;
    }

    try {
        statisticsRawData = await modelType;
    } catch (err) {
        const error = new HttpError('Nie udało mi się pobrać danych statystycznych.', 500);
        return next(error);
    }

    if (!statisticsRawData || statisticsRawData.length === 0) {
        const error = new HttpError('Nie znalazłem danych statystycznych dla tego zapytania.', 404);
        return next(error);
    }

    if (userType === 'group') {
        groupName = removeAccents(statisticsRawData.name);

        const PDFDocument = require('pdfkit');
        const pdfPath = path.join('public', 'downloads', 'reports', 'Raport' + ' ' + groupName + '.pdf');
        const pdfDoc = new PDFDocument();

        const pdfDocHeader = () => {
            const startDay = new Date(startDate).getDate().toString().length === 2 ? new Date(startDate).getDate() : '0' + new Date(startDate).getDate();
            const startMonth = (new Date(startDate).getMonth() + 1).toString().length === 2 ? new Date(startDate).getMonth() + 1 : '0' + (new Date(startDate).getMonth() + 1);
            const startYear = new Date(startDate).getFullYear();

            const endDay = new Date(endDate).getDate().toString().length === 2 ? new Date(endDate).getDate() : '0' + new Date(endDate).getDate();
            const endMonth = (new Date(endDate).getMonth() + 1).toString().length === 2 ? new Date(endDate).getMonth() + 1 : '0' + (new Date(endDate).getMonth() + 1);
            const endYear = new Date(endDate).getFullYear();

            pdfDoc
                .image('public/downloads/images/logo.jpeg', 220, 0, { width: 200, height: 100 }).moveDown(3)
                .fontSize(12)
                .font('PolishFontRegular')
                .text('Raport nauczania dla grupy ', { continued: true, underline: true })
                .font('PolishFontBold')
                .text(statisticsRawData.name)
                .moveDown()
                .fontSize(11)
                .text('Liczba godzin: ' + statisticsRawData.topics.length + ' / ' + statisticsRawData.lessonLength + ' ' + 'minut', { continued: true })
                .fontSize(10)
            startDate && endDate ?
                pdfDoc
                    .text(`Od ${startDay + '.' + startMonth + '.' + startYear} do ${endDay + '.' + endMonth + '.' + endYear}`, { align: 'right' }).moveDown(0.2)
                :
                pdfDoc
                    .text(`Od początku roku szkolnego do ${new Date().toLocaleDateString().length < 10 ? '0' + new Date().toLocaleDateString() : new Date().toLocaleDateString()}r.`, { align: 'right' }).moveDown(0.2)
            pdfDoc
                .text(`Lektor: ${statisticsRawData.teacher[0] ? statisticsRawData.teacher[0].name + '  ' + statisticsRawData.teacher[0].surname : 'Brak danych'}`).moveDown(1.5);
        }

        let presentDates = [];
        const presentStudentDates = (studentId) => {
            for (let topics of statisticsRawData.topics) {
                for (let presentStudents of topics.presentStudents) {
                    if (presentStudents.id === studentId) {
                        let day = new Date(topics.lessonDate).getDate().toString().length === 2 ? new Date(topics.lessonDate).getDate() : '0' + new Date(topics.lessonDate).getDate();
                        let month = (new Date(topics.lessonDate).getMonth() + 1).toString().length === 2 ? new Date(topics.lessonDate).getMonth() + 1 : '0' + (new Date(topics.lessonDate).getMonth() + 1);
                        let year = new Date(topics.lessonDate).getFullYear();

                        presentDates.push(day + '.' + month + '.' + year);
                    }
                }
            }
        }

        let absentDates = [];
        const absentStudentDates = (studentId) => {
            for (let topics of statisticsRawData.topics) {
                for (let absentStudents of topics.absentStudents) {
                    if (absentStudents.id === studentId) {
                        let day = new Date(topics.lessonDate).getDate().toString().length === 2 ? new Date(topics.lessonDate).getDate() : '0' + new Date(topics.lessonDate).getDate();
                        let month = (new Date(topics.lessonDate).getMonth() + 1).toString().length === 2 ? new Date(topics.lessonDate).getMonth() + 1 : '0' + (new Date(topics.lessonDate).getMonth() + 1);
                        let year = new Date(topics.lessonDate).getFullYear();

                        absentDates.push(day + '.' + month + '.' + year);
                    }
                }
            }
        }

        const pdfDocStudents = () => {
            pdfDoc
                .font('PolishFontBold')
                .fontSize(12)
                .text('Lista słuchaczy')
                .moveDown(0.5)
            for (let student of statisticsRawData.students) {
                presentStudentDates(student.id);
                absentStudentDates(student.id);
                pdfDoc
                    .underline(60, pdfDoc.y + 15, 520, 1, { color: 'black' })
                    .fontSize(10)
                    .font('PolishFontBold')
                    .text(student.name + ' ' + student.surname, 70).moveDown(.3)
                presentDates.length === 0 && statisticsRawData.topics.length > 0 ?
                    pdfDoc
                        .fontSize(10)
                        .text('Obecność: -------------') :
                    pdfDoc
                        .font('PolishFontBold')
                        .fontSize(10)
                        .text('Obecność:').moveUp()
                        .font('PolishFontRegular')
                        .fontSize(9)
                        .text(statisticsRawData.topics.length > 0 ? presentDates.map(date => ' ' + date) : 'Brak danych', 150)
                        .font('PolishFontBold')
                absentDates.length === 0 && statisticsRawData.topics.length > 0 ? pdfDoc
                    .fontSize(10)
                    .text('Nieobecność: -----------', 70)
                    .moveDown(1.5) :
                    pdfDoc
                        .fontSize(10)
                        .text('Nieobecność:', 70)
                        .moveUp()
                        .font('PolishFontRegular')
                        .fontSize(9)
                        .text(statisticsRawData.topics.length > 0 ? absentDates.map(date => ' ' + date) : 'Brak danych', 150)
                        .moveDown(2)
                presentDates = [];
                absentDates = [];
            }
        }

        const pdfDocTopics = () => {
            let index = 1;
            pdfDoc.font('PolishFontBold').moveDown(2)
                .fontSize(10)
                .underline(60, pdfDoc.y - 5, 520, 1, { color: 'black' })
                .underline(60, pdfDoc.y + 20, 520, 1, { color: 'black' })
                .text('Lp', 67).moveUp()
                .text('Data', 112).moveUp()
                .text('Temat zajęć', { align: 'center' }).moveUp()
                .moveDown()
            for (let topic of statisticsRawData.topics) {

                let day = new Date(topic.lessonDate).getDate().toString().length === 2 ? new Date(topic.lessonDate).getDate() : '0' + new Date(topic.lessonDate).getDate();
                let month = (new Date(topic.lessonDate).getMonth() + 1).toString().length === 2 ? new Date(topic.lessonDate).getMonth() + 1 : '0' + (new Date(topic.lessonDate).getMonth() + 1);
                let year = new Date(topic.lessonDate).getFullYear();

                pdfDoc
                    .moveDown()
                    .fontSize(10)
                    .font('PolishFontRegular')
                    .text(index, 70).moveUp()
                    .text(day + '.' + month + '.' + year, 100).moveUp()
                    .text(topic.topic, 200).moveUp()
                    .moveDown(0.3)
                index++;;
            }
            pdfDoc.moveDown()
        }

        const generatePDFFile = () => {

            const day = new Date().getDate().toString().length === 2 ? new Date().getDate() : '0' + new Date().getDate();
            const month = (new Date().getMonth() + 1).toString().length === 2 ? new Date().getMonth() + 1 : '0' + (new Date().getMonth() + 1);
            const year = new Date().getFullYear();

            pdfDoc.pipe(fs.createWriteStream(pdfPath));
            pdfDoc.registerFont('PolishFontRegular', 'public/downloads/fonts/Cantarell-Regular.ttf');
            pdfDoc.registerFont('PolishFontBold', 'public/downloads/fonts/Cantarell-Bold.ttf');
            pdfDocHeader();
            pdfDocStudents();
            pdfDocTopics();
            pdfDoc
                .fontSize(8)
                .font('PolishFontRegular')
                .text(`Koniec dokumentu. Wygenerowano ${day + '.' + month + '.' + year}`, 60)
            pdfDoc.end();
        }
        // const imagePath = path.join('public', 'downloads', 'images', 'logo.jpeg');
        // const s3 = new AWS.S3({
        //     accessKeyId: process.env.ACCESS_KEY_ID,
        //     secretAccessKey: process.env.SECRET_ACCESS_KEY,
        //     region: process.env.REGION
        // });

        // const params = {
        //     Bucket: process.env.BUCKET_NAME,
        //     Key: 'logo.jpeg'
        // };
        // const fileStream = fs.createWriteStream(imagePath);
        // const s3Stream = s3.getObject(params).createReadStream();

        // s3Stream.on('error', function (err) {
        //     console.error(err);
        // });

        // s3Stream.pipe(fileStream).on('error', (err) => {
        //     console.error('File Stream:', err);
        // }).on('close', () => {
        //     fs.createReadStream(imagePath);
        //     generatePDFFile();
        // });

        downloadDocumentFromAWS('logo.jpeg', generatePDFFile);
    }

    res.json({ statisticsRawData: statisticsRawData.toObject({ getters: true }) });
};

const getPDFReport = (req, res, next) => {
    const pdfPath = path.join('public', 'downloads', 'reports', 'Raport' + ' ' + groupName + '.pdf');


    const pdfDoc = fs.createReadStream(pdfPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
        'Content-Disposition',
        'attachment; filename="Raport' + ' ' + groupName + '.pdf"'
    );
    pdfDoc.pipe(res);
}



exports.getOneStatistcsObject = getOneStatistcsObject;
exports.getOneStatistcsObjectByDate = getOneStatistcsObjectByDate;
exports.getPDFReport = getPDFReport;