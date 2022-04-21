const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const settingsSchema = new Schema(
    {
        schoolYearSchedlue: { type: Object, required: false },
        bankAccount: { type: String, required: false },
        rodo: [{ type: Object, required: false }],
        courses: [{ type: Object, required: false }],
        internalMessages: [{ type: Object, required: false }],
        gracePeriod: { type: String, required: false }
    }
);


module.exports = mongoose.model('Settings', settingsSchema);