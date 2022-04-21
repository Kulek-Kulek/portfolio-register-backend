const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk');

exports.getInvoice = (req, res, next) => {

    const invoiceName = req.params.invoiceKey;
    const invoicePath = path.join('public', 'downloads', 'invoices', invoiceName);

    const s3 = new AWS.S3({
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
        region: process.env.REGION
    });

    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: invoiceName
    };
    const fileStream = fs.createWriteStream(invoicePath);
    const s3Stream = s3.getObject(params).createReadStream();

    s3Stream.on('error', function (err) {
        console.error(err);
    });

    s3Stream.pipe(fileStream).on('error', (err) => {
        console.error('File Stream:', err);
    }).on('close', () => {
        file = fs.createReadStream(invoicePath);
        res.setHeader('Content-Type', 'Application/pdf');
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="' + invoiceName + '"'
        );
        file.pipe(res);
    });
}