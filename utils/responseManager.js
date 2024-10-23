const fs = require('fs').promises;
const path = require('path');

async function readJsonFile(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
}

async function writeJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function addUser(user) {
    const users = await readJsonFile('./data/users.json').catch(() => []);
    if (!users.some(u => u.id === user.id)) {
        users.push({ id: user.id, username: user.username || user.first_name });
        await writeJsonFile('./data/users.json', users);
    }
}

async function addAdmin(admin) {
    const admins = await readJsonFile('./data/admins.json').catch(() => []);
    if (!admins.some(a => a.id === admin.id)) {
        admins.push({ id: admin.id, username: admin.username || admin.first_name });
        await writeJsonFile('./data/admins.json', admins);
    }
}

async function removeAdmin(admin) {
    const admins = await readJsonFile('./data/admins.json').catch(() => []);
    const updatedAdmins = admins.filter(a => a.id !== admin.id);
    if (updatedAdmins.length !== admins.length) {
        await writeJsonFile('./data/admins.json', updatedAdmins);
        return true; 
    }
    return false; 
}

async function addLearningResponse(inputMessage, responses) {
    const aiResponses = await readJsonFile('./data/ai.json').catch(() => ({}));
    aiResponses[inputMessage] = aiResponses[inputMessage] || [];
    aiResponses[inputMessage].push(...responses);
    await writeJsonFile('./data/ai.json', aiResponses);
}

async function getRandomResponse(inputMessage) {
    const aiResponses = await readJsonFile('./data/ai.json').catch(() => ({}));
    const responses = aiResponses[inputMessage];
    if (responses) {
        const randomIndex = Math.floor(Math.random() * responses.length);
        return responses[randomIndex];
    }
    return null;
}

async function deleteResponsesByKeyword(keyword) {
    const aiResponses = await readJsonFile('./data/ai.json').catch(() => ({}));

    if (aiResponses[keyword]) {
        delete aiResponses[keyword];
        await writeJsonFile('./data/ai.json', aiResponses);
        return true;
    }
    return false;
}


async function saveGif(fileId, fileName, bot, token) {
    const fileUrl = await bot.getFileLink(fileId);
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    
    const filePath = path.join(__dirname, './gifs', fileName);
    await fs.writeFile(filePath, response.data);
}

async function getRandomGif() {
    const gifs = await fs.readdir(path.join(__dirname, './gifs')).catch(() => []);
    if (gifs.length > 0) {
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
        return path.join(__dirname, './gifs', randomGif);
    }
    return null;
}

module.exports = {
    getRandomResponse,
    addUser,
    addAdmin,
    removeAdmin,
    addLearningResponse,
    deleteResponsesByKeyword,
    saveGif,
    getRandomGif
};
