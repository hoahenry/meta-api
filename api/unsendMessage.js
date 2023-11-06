module.exports = function({ browser, utils, Language }) {
    return async function(messageID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!messageID || !String.isString(messageID)) return callback(Language('unsendMessage', 'needMessageID'), null);
        var response = await browser.post('https://www.facebook.com/messaging/unsend_message/', { message_id: messageID });
        return !response ? callback(Language('unsendMessage', 'failedUnsend', messageID)) : response.error ? callback(response) : callback(null);
    }
}