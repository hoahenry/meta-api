module.exports = function({ defaults, utils }) {
    var { makeCallback, includes } = utils;
    return async function(userID, threadID, callback) {
        if (!callback) callback = makeCallback();
        if (!userID || includes(threadID, 'String', 'Number')) return callback('Please pass a userID in the first arguments.');
        if (!threadID || includes(threadID, 'String', 'Number')) return callback('Please pass a threadID as a second argument.');
        var form = {
            uid: userID,
            tid: threadID
        }
        var response = await defaults.post('https://www.facebook.com/chat/remove_participants', form);
        if (!response || response.error) return callback(response);
        return callback(null);
    }
}