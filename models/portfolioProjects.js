const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const portfolioProjectSchema = new Schema({
    name: { type: String, required: true },
    desc: { type: String, required: true },
    gitHub: { type: Object, required: true },
    imgFront: { type: String, required: true },
    mainStack: { type: String, required: true },
    stack: [{ type: String, required: true }],
    webpage: { type: Object, required: true }
});

module.exports = mongoose.model('portfolioProject', portfolioProjectSchema);