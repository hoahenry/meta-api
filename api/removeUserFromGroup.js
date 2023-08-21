module.exports = function({ browser, utils }) {
    return async function(userID, threadID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!userID || !utils.includes(threadID, 'String', 'Number')) return callback('Please pass a userID in the first arguments.');
        if (!threadID || !utils.includes(threadID, 'String', 'Number')) return callback('Please pass a threadID as a second argument.');
        var response = await browser.post('https://www.facebook.com/chat/remove_participants', {
            uid: userID,
            tid: threadID
        });
        return !response || response.error ? callback(response) : callback(null);
    }
}