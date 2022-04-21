const Vonage = require('@vonage/server-sdk');

const removeAccents = require('./accents');

const vonage = new Vonage({
    apiKey: process.env.VONAGE_API_KEY,
    apiSecret: process.env.VONAGE_API_SECRET
});

const sendSMS = (from, to, text) => {
    let message = removeAccents(text);

    vonage.message.sendSms(from, to, message, (err, responseData) => {
        if (err) {
            console.log(err);
        } else {
            if (responseData.messages[0]['status'] === "0") {
                console.log("Message sent successfully.");
            } else {
                console.log(`Message failed with error: ${responseData.messages[0]['error-text']}`);
            }
        }
    });
}

module.exports = sendSMS;