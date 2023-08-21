module.exports = function({ browser, utils, client }) {
    return async function(threadID, markRead = true, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!threadID || !utils.includes(threadID, 'String', 'Number')) return callback('Please pass a threadID in the first arguments', null);
        var response = await browser.post('https://www.facebook.com/ajax/mercury/change_read_status.php', {
            source: 'PagesManagerMessagesInterface',
            request_user_id: client.configs.pageID,
            ["ids[" + threadID + "]"]: markRead,
            watermarkTimestamp: new Date().getTime(),
            shouldSendReadReceipt: true,
            commerce_last_message_type: ''
        });
        return !response || response.error ? callback(response) : callback(null);
    }
}