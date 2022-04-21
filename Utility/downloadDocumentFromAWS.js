const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const downloadDocumentFromAWS = (key, generatePDFFile, streamCertificatePdf) => {
    const documentType = key ? key.substring(0, 11) : undefined;

    const imagePath = path.join('public', 'downloads', documentType === 'certificate' ? 'certificates' : 'images', key);
    const s3 = new AWS.S3({
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
        region: process.env.REGION
    });

    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: key
    };
    const fileStream = fs.createWriteStream(imagePath);
    const s3Stream = s3.getObject(params).createReadStream();

    s3Stream.on('error', function (err) {
        console.error(err);
    });

    s3Stream.pipe(fileStream).on('error', (err) => {
        console.error('File Stream:', err);
    }).on('close', () => {
        fs.createReadStream(imagePath);
        generatePDFFile && generatePDFFile();

        streamCertificatePdf && setTimeout(() => {
            streamCertificatePdf();
        }, 1500);;
    });
}

module.exports = downloadDocumentFromAWS;