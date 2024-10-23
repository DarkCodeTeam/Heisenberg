const moment = require('moment-jalaali');

function getShamsiDate() {
    return moment().format('jYYYY/jMM/jDD');
}
function getGregorianDate() {
    return moment().format('YYYY/MM/DD');
}
module.exports = {
    getShamsiDate,
    getGregorianDate
};