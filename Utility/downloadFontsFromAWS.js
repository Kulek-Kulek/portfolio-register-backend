const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');


const downloadPolishFontsFromAWS = (font) => {
    const fontsPath = path.join('public', 'downloads', 'fonts', font);

    const s3RegularFonts = new AWS.S3({
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
        region: process.env.REGION
    });

    const paramsRegularFonts = {
        Bucket: process.env.BUCKET_NAME,
        Key: font
    };
    const fileStreamRegularFonts = fs.createWriteStream(fontsPath);
    const s3StreamRegularFonts = s3RegularFonts.getObject(paramsRegularFonts).createReadStream();

    s3StreamRegularFonts.on('error', function (err) {
        console.error(err);
    });

    s3StreamRegularFonts.pipe(fileStreamRegularFonts).on('error', (err) => {
        console.error('File Stream:', err);
    }).on('close', () => {
        fs.createReadStream(fontsPath);
    });



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
    //     fs.createReadStream(boldFontsPath);
    // });
}

module.exports = downloadPolishFontsFromAWS;