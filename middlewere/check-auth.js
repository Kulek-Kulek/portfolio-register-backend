const jwt = require('jsonwebtoken');
const HttpError = require('../models/http-error');



module.exports = (req, res, next) => {

    if (req.method === 'OPTIONS') {
        return next();
    }
    let token = req.params.token;
    try {
        if (!token) {
            throw new Error('Autoryzacja nie powiodła się.')
        }
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        req.userData = { userId: decodedToken.userId };
        next();
    } catch (err) {
        const error = new HttpError('Autoryzacja nie powiodła się', 401);
        return next(error);
    }
}