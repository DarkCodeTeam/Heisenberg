const fs = require('fs');

function readJsonFile(filepath) {
    return JSON.parse(fs.readFileSync(filepath));
}

function writeJsonFile(filepath, data) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

module.exports = {
    readJsonFile,
    writeJsonFile
};