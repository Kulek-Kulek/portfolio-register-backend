const Student = require('../models/student');
const Settings = require('../models/setting');

const sendSMS = require('../Utility/sendSMS');
const sendEmail = require('../Utility/sendEmail');

const monitorPayments = async () => {
    let settings;
    try {
        settings = await Settings.find();
    } catch (err) {
        console.log(err);
    }
    if (!settings || settings.length === 0) {
        console.log('Nie pobrałem ustawień apliakcji.');
    }

    let students;
    try {
        students = await Student.find();
    } catch (err) {
        console.log(err);
    }
    if (!students || students.length === 0) {
        console.log('Nie pobrałem listy uczniów do corn.');
    }

    Date.prototype.addDays = function (days) {
        const date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
    }

    let gracePeriod = 9;
    if (settings && settings.length > 0 && settings[0].gracePeriod) {
        gracePeriod = 2 + +settings[0].gracePeriod;
    }

    let studentsWithDebts = [];

    for (let student of students) {
        const updatedFinancialRates = student.financialRates;
        const updatedInvoices = student.invoices;

        for (let studentRate of student.financialRates) {
            const overdueDocumentDate = new Date(studentRate.documentDeadline);

            if ((new Date(overdueDocumentDate.addDays(gracePeriod)).getTime() <= new Date().getTime() && studentRate.documentStatus === 'issued') || (new Date(overdueDocumentDate.addDays(gracePeriod + (studentRate.sentPromptNote && studentRate.sentPromptNote.length * 5))).getTime() <= new Date().getTime() && studentRate.documentStatus === 'overdue')) {

                studentRate.documentStatus = 'overdue';
                if (studentRate.sentPromptNote) {
                    studentRate.sentPromptNote.unshift(new Date().toISOString());
                } else {
                    studentRate.sentPromptNote = [];
                    studentRate.sentPromptNote.unshift(new Date().toISOString());
                }

                for (let doc of updatedFinancialRates) {
                    if (doc.id === studentRate.id) {
                        const index = updatedFinancialRates.findIndex(doc => doc.id === studentRate.id);
                        updatedFinancialRates.splice(index, 1, studentRate);
                    }
                }

                studentsWithDebts.push(
                    {
                        id: student._id,
                        name: student.name,
                        surname: student.surname,
                        mobile: student.invoiceData && student.invoiceData.mobile || student.mobile,
                        email: student.invoiceData && student.invoiceData.email
                            || student.email
                    }
                );
            }
        }

        for (let invoice of student.invoices) {
            const overdueInvoiceDate = new Date(invoice.invoiceDeadline);

            if ((new Date(overdueInvoiceDate.addDays(gracePeriod)).getTime() <= new Date().getTime() && invoice.invoiceStatus === 'issued') || (new Date(overdueInvoiceDate.addDays(gracePeriod + (invoice.sentPromptNote && invoice.sentPromptNote.length * 5))).getTime() <= new Date().getTime() && invoice.invoiceStatus === 'overdue')) {
                invoice.invoiceStatus = 'overdue';

                if (invoice.sentPromptNote) {
                    invoice.sentPromptNote.unshift(new Date().toISOString());
                } else {
                    invoice.sentPromptNote = [];
                    invoice.sentPromptNote.unshift(new Date().toISOString());
                }

                for (let doc of updatedInvoices) {
                    if (doc.id === invoice.id) {
                        const index = updatedInvoices.findIndex(doc => doc.id === invoice.id);
                        updatedInvoices.splice(index, 1, invoice);
                    }
                }

                studentsWithDebts.push(
                    {
                        id: student._id,
                        name: student.name,
                        surname: student.surname,
                        mobile: student.invoiceData && student.invoiceData.mobile || student.mobile,
                        email: student.invoiceData && student.invoiceData.email
                            || student.email
                    }
                )
            }
        }
        student.financialRates = updatedFinancialRates;
        student.invoices = updatedInvoices;
        try {
            await student.save();
        } catch (err) {
            console.log(err);
        }
    }

    console.log(studentsWithDebts);
    if (studentsWithDebts.length > 0) {
        const uniqueStudentsWithDebts = [...new Map(studentsWithDebts.map(item => [item.id, item])).values()];
        for (let debtor of uniqueStudentsWithDebts) {
            const from = process.env.COMPANY_NAME;
            const to = +("48" + debtor.mobile);
            const text = `Dzien dobry. Na Twoim koncie w systemie ${process.env.COMPANY_NAME} znajduja sie dokumenty finansowe, ktorym uplynal termin platnosci. Prosimy o uregulowanie zadluzenia.`;

            // sendSMS(from, to, text);

            const emailTo = debtor.email;
            const emailFrom = process.env.COMPANY_EMAIL;
            const emailSubject = `${process.env.COMPANY_NAME} - nieopłacona faktura.`;
            const htmlMessage = `<h3>Dzień dobry,</h3><p>Na Twoim koncie w systemie ${process.env.COMPANY_NAME} znajdują sie dokumenty finansowe, którym upłynął termin płatności.</p><p>Kliknij <a href=${process.env.COMPANY_REGISTER_URL}>Zaloguj mnie do systemu</a>, żeby sprawdzić szczegóły.</p><p>Jeśli dokument został już opłacony, potraktuj tę wiadomość jako nieaktualną.</p></h3><h3>Pozdrawiamy,</h3><h3>Zespół ${process.env.COMPANY_NAME}</h3></h3>`;

            // sendEmail(emailTo, emailFrom, emailSubject, htmlMessage);
        }
    }
}

module.exports = monitorPayments;