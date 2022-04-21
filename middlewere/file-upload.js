const { v1: uuid } = require('uuid');
const aws = require('aws-sdk');
const multer = require('multer');
// const multerS3 = require('multer-s3');
const s3Storage = require('multer-sharp-s3');



aws.config.update({
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    accessKeyId: process.env.ACCESS_KEY_ID,
    region: process.env.REGION
});

const s3 = new aws.S3();

const MIME_TYPE_MAP = {
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpg': 'jpg',
    'image/jpeg': 'jpeg',
}


const fileUpload = multer({

    storage: s3Storage({
        s3: s3,
        Bucket: process.env.BUCKET_NAME,
        ACL: 'public-read',

        // Metadata: function (req, file, cb) {
        //     const extention = MIME_TYPE_MAP[file.mimetype];
        //     cb(null, { fieldName: uuid() + '.' + extention });
        // },

        Key: function (req, file, cb) {
            const extention = MIME_TYPE_MAP[file.mimetype];
            cb(null, uuid() + '.' + extention);
        },
        resize: { width: 250, height: 250, },
    }),
    fileFilter: (req, file, cb) => {
        const isValid = !!MIME_TYPE_MAP[file.mimetype];
        let error = isValid ? null : new Error('Invalid mime type!');
        cb(error, isValid)
    }
});
module.exports = fileUpload;



//discstorage code below


// const multer = require('multer');
// const { v1: uuid } = require('uuid');

// const MINME_TYPE_MAP = {
//     'application/pdf': 'pdf',
// }

// const fileUpload = multer({

//     limits: 500000,
//     storage: multer.diskStorage({
//         destination: (req, file, cb) => {
//             cb(null, 'uploads/invoices')
//         },
//         filename: (req, file, cb) => {
//             // const name = file.originalname.substring(0, file.originalname.length - 4);
//             const extention = MINME_TYPE_MAP[file.mimetype];
//             // cb(null, name + '-' + uuid() + extention);
//             cb(null, uuid() + extention);
//         }
//     }),
//     fileFilter: (req, file, cb) => {
//         const isValid = !!MINME_TYPE_MAP[file.mimetype];
//         let error = isValid ? null : new Error('Invalid mime type!');
//         cb(error, isValid)
//     }
// });
    
// module.exports = fileUpload;



