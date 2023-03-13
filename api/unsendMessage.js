module.exports = function({ requestDefaults, utils }) {
    var { makeCallback } = utils;
    return async function(messageID, callback) {
        if (!callback) callback = makeCallback();
        if (!messageID || !String.isString(messageID)) return callback('Please pass a messageID in the first arguments', null);
        var response = await requestDefaults.post('https://www.facebook.com/messaging/unsend_message/', { message_id: messageID });
        if (response.error) return callback(response.error, false);
        else callback(null, true);
    }
}