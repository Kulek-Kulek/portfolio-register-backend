const fs = require('fs');
const path = require('path');

const downloadPolishFontsFromAWS = require('../Utility/downloadFontsFromAWS');
const downloadDocumentFromAWS = require('../Utility/downloadDocumentFromAWS');
const HttpError = require('../models/http-error');
const Student = require('../models/student');
const doc = require('pdfkit');


const getCertificatePDF = async (req, res, next) => {

    const { studentId, groupId } = req.params;

    let student;
    try {
        student = await Student.findById(studentId, '-status -password')
            .populate({ path: 'topics' })
            .populate({ path: 'group', match: { _id: groupId }, populate: { path: 'teacher' } })
    } catch (err) {
        const error = new HttpError('Nie udało mi się znaleźć tego ucznia.', 500);
        return next(error);
    }

    if (!student || student.length === 0) {
        const error = new HttpError('Nie znalazłem tego ucznia w bazie danych.', 404);
        return next(error);
    }


    let studentCourseGrade;
    let endTermGrade = student.endTermGrades;
    if (endTermGrade && endTermGrade.length > 0) {
        for (let grade of endTermGrade) {
            if (grade.endTermGradeType === 'Ocena końcowa') {
                studentCourseGrade = grade.grade;
            }
        }
    }

    let allInvoicesPaid = true;

    let payments = student.financialRates.concat(student.invoices);

    if (payments && payments.length > 0) {
        for (let doc of payments) {
            if (doc.invoiceStatus !== 'paid' || doc.documentStatus !== 'paid') {
                allInvoicesPaid = false;
            }
        }
    }

    const languageCode = student.group[0].name.substring(0, 2);
    let languageCourseName;
    switch (languageCode) {
        case 'JA': languageCourseName = 'angielskiego';
            break;
        case 'JN': languageCourseName = 'niemieckiego';
            break;
        case 'JF': languageCourseName = 'francuskiego';
            break;
        case 'JH': languageCourseName = 'hiszpańskiego';
            break;
        case 'JW': languageCourseName = 'włoskiego';
            break;
        default: languageCourseName = 'angielskiego';
    }

    const name = student.name + ' ' + student.surname;
    const birthday = student.birthday ? new Date(student.birthday).toLocaleDateString() : undefined;
    const birthplace = student.birthplace;
    const grade = studentCourseGrade;
    const teacher = student.group[0].teacher[0].name + ' ' + student.group[0].teacher[0].surname;
    const certificateType = student.group[0].certificateType;
    const groupLevel = student.group[0].groupLevel;
    const schoolYear = student.group[0].schoolYear;
    const courseLength = student.group[0].courseLength;


    if (!name || !birthday || !birthplace) {
        const error = new HttpError('Do wystawienia świadectwa potrzebujemy takich danych, jak: imię, nazwisko, miejsce urodzenia, data urodzenia. Uzupełnij brakujące dane. Wejdź w zakładkę obok - "O Tobie" i kliknij Aktualizuj. Potem pobierz swój certyfikat.', 404);
        return next(error);
    }

    // if (!allInvoicesPaid) {
    //     const error = new HttpError('Ups, coś tu zalega. Wygląda na to, że nie masz jeszcze opłaconych wszystkich zobowiązań finansowych. Ureguluj należoności, żeby móc pobrać swój certyfikat.', 404);
    //     return next(error);
    // }


    let downloadCertificateType;
    let nameLeft;
    let nameTop;
    let languageCourseNameLeft;
    let languageCourseNameTop;
    let schoolYearLeft;
    let schoolYearTop;
    let courseLengthLeft;
    let courseLengthTop;
    let gradeLeft;
    let gradeTop;
    let teacherLeft;
    let teacherTop;

    switch (certificateType) {
        case 'Certyfikat dla dzieci':
            downloadCertificateType = 'certificateChildren.png';
            nameLeft = 180;
            nameTop = 437;
            languageCourseNameLeft = 418;
            languageCourseNameTop = 302;
            schoolYearLeft = 465;
            schoolYearTop = 326;
            courseLengthLeft = 385;
            courseLengthTop = 347;
            gradeLeft = 342;
            gradeTop = 365;
            teacherLeft = 115;
            teacherTop = 570;
            break;
        case 'Certyficat dla dorosłych i młodzieży':
            downloadCertificateType = 'certificateAdult.png';
            nameLeft = 90;
            nameTop = 297;
            break;
        case 'Certyfikat pośredni': downloadCertificateType = 'certificateMiddle.png';
            break;
        default: downloadCertificateType = 'certificateChildren.png';
    }


    downloadPolishFontsFromAWS('Cantarell-Regular.ttf');
    downloadPolishFontsFromAWS('GreatVibes-Regular.otf');
    // console.log(name, birthday, birthplace, grade, teacher, certificateType, groupLevel, schoolYear, courseLength, languageCourseName);

    const PDFDocument = require('pdfkit');
    const pdfPath = path.join('public', 'downloads', 'certificates', 'CERTYFIKAT' + '.pdf');
    const pdfDoc = new PDFDocument();


    const pdfCertImg = () => {
        pdfDoc
            .image('public/downloads/certificates/' + downloadCertificateType, 2, 5, { width: 608, height: 785 });
    }
    const pdfName = () => {
        pdfDoc
            .fontSize(22)
            .font('PolishFontStyle')
            .text(name, nameLeft, nameTop);
    }
    const pdflanguageCourseName = () => {
        pdfDoc
            .fontSize(16)
            .font('PolishFontRegular')
            .fillColor('grey')
            .text(languageCourseName, languageCourseNameLeft, languageCourseNameTop);
    }
    const pdfSchoolYear = () => {
        pdfDoc
            .fontSize(12)
            .font('PolishFontRegular')
            .fillColor('grey')
            .text(schoolYear, schoolYearLeft, schoolYearTop);
    }
    const pdfCourseLength = () => {
        pdfDoc
            .fontSize(12)
            .font('PolishFontRegular')
            .fillColor('grey')
            .text(courseLength, courseLengthLeft, courseLengthTop);
    }
    const pdfGrade = () => {
        pdfDoc
            .fontSize(14)
            .font('PolishFontRegular')
            .fillColor('grey')
            .text(grade, gradeLeft, gradeTop);
    }
    const pdfTeacher = () => {
        pdfDoc
            .fontSize(22)
            .font('PolishFontStyle')
            .text(teacher, teacherLeft, teacherTop);
    }


    const generatePDFFile = () => {
        pdfDoc.pipe(fs.createWriteStream(pdfPath));
        pdfDoc.registerFont('PolishFontRegular', 'public/downloads/fonts/Cantarell-Regular.ttf');
        pdfDoc.registerFont('PolishFontStyle', 'public/downloads/fonts/GreatVibes-Regular.otf');

        pdfCertImg();
        pdfName();
        pdflanguageCourseName();
        pdfSchoolYear();
        pdfCourseLength();
        pdfGrade();
        pdfTeacher();
        pdfDoc.end();
    }

    const streamCertificatePdf = () => {
        const certPath = path.join('public', 'downloads', 'certificates', 'CERTYFIKAT.pdf');

        const pdfCert = fs.createReadStream(certPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="CERTYFIKAT.pdf"'
        );
        pdfCert.pipe(res);
    }

    downloadDocumentFromAWS(downloadCertificateType, generatePDFFile, streamCertificatePdf);


}


exports.getCertificatePDF = getCertificatePDF;
