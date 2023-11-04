module.exports = function({ browser, utils, Language }) {
    return async function(userID, threadID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!userID || !utils.includes(threadID, 'String', 'Number')) return callback(Language('removeUserFromGroup', 'needUserID'));
        if (!threadID || !utils.includes(threadID, 'String', 'Number')) return callback(Language('removeUserFromGroup', 'needThreadID'));
        var response = await browser.post('https://www.facebook.com/chat/remove_participants', {
            uid: userID,
            tid: threadID
        });
        return !response || response.error ? callback(response) : callback(null);
    }
}