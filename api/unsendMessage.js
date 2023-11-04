module.exports = function({ browser, utils }) {
    return async function(messageID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!messageID || !String.isString(messageID)) return callback(Language('unsendMessage', 'needMessageID'), null);
        var response = await browser.post('https://www.facebook.com/messaging/unsend_message/', { message_id: messageID });
        return !response || response.error ? callback(response) : callback(null);
    }
}