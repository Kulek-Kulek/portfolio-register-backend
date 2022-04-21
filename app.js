const fs = require('fs');

const express = require('express');

const mongoose = require('mongoose');

const cron = require('node-cron');

const monitorPayments = require('./corns/monitorPayments');

const HttpError = require('./models/http-error');


const offerRoutes = require('./routes/offer-routes');
const studentRoutes = require('./routes/student-routes');
const teacherRoutes = require('./routes/teacher-routes');
const topicRoutes = require('./routes/topic-routes');
const gradeRoutes = require('./routes/grade-routes');
const groupRoutes = require('./routes/group-routes');
const orderRoutes = require('./routes/order-routes');
const contactRoutes = require('./routes/contact-routes');
const loginRoutes = require('./routes/login-route');
const loginSupervisorRoutes = require('./routes/loginSupervisor-route');
const adminRoutes = require('./routes/admin-routes');
const sendEmailRoutes = require('./routes/sendEmail-routes');
const paymentsRoutes = require('./routes/payments-routes');
const invoiceRoutes = require('./routes/invoice-routes');
const generalDocumentsRoutes = require('./routes/generalDocuments-routes');
const statisticsRoutes = require('./routes/statistics-routes');
const certificateRoutes = require('./routes/certificate-routes');
const settingsRoutes = require('./routes/settings-routes');
const sendEmail = require('./Utility/sendEmail');
const portfolioProjectsRoutes = require('./routes/portfolioProjects-routes');


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    next();
});

app.use('/api/offers', offerRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/login-supervisor', loginSupervisorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/send-email', sendEmailRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/documents', generalDocumentsRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/teacher-image', teacherRoutes);
app.use('/api/student-image', studentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/portfolio-projects', portfolioProjectsRoutes);



app.use((req, res, next) => {
    const error = new HttpError('Could not find this route', 404);
    return next(error);
});

app.use((error, req, res, next) => {
    if (req.file && req.file.path) {
        fs.unlink(req.file.path, err => {
            console.log(err)
        });
    }
    if (res.headerSent) {
        return next(error);
    };
    res.status(error.code || 500);
    res.json({ message: error.message || 'Upsss, coś poszło nie tak.' })
});


cron.schedule('2 12 * * *', function () {
    sendEmail('k.lugowski@yahoo.com', 'lugowski.k@gmail.com', 'Test corn', 'I am working. It is 12.02.');
}, {
    scheduled: true,
    timezone: "Europe/Warsaw"
});

cron.schedule('4 12 * * *', function () {
    monitorPayments();
}, {
    scheduled: true,
    timezone: "Europe/Warsaw"
});


mongoose
    .connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_SOURCE}/${process.env.DB_NAME}?retryWrites=true&w=majority`,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
    .then(() => {
        app.listen(process.env.PORT || 5000);
        console.log('working...');
    })

    .catch(err => {
        console.log(err);
    });





