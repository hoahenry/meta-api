module.exports = function({ requestDefaults, utils, globalOptions }) {
    var { makeCallback, includes } = utils;
    return async function(threadID, markRead = true, callback) {
        if (!callback) callback = makeCallback();
        if (!threadID || !includes(threadID, 'String', 'Number')) return callback('Please pass a threadID in the first arguments', null);
        var form = {
            source: 'PagesManagerMessagesInterface',
            request_user_id: globalOptions.pageID,
            ["ids[" + threadID + "]"]: markRead,
            watermarkTimestamp: new Date().getTime(),
            shouldSendReadReceipt: true,
            commerce_last_message_type: ''
        }
        var response = await requestDefaults.post('https://www.facebook.com/ajax/mercury/change_read_status.php', form);
        if (!response || response.error) return callback(response);
        return callback(null);
    }
}