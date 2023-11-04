module.exports = function({ browser, client, utils, log, Language }) {
    return async function(userID, threadID, callback) {
        if (!callback && Function.isFunction(threadID)) return log('addUserToGroup', Language('addUsersToGroup', 'needThreadID'), 'warn');
        if (!callback) callback = utils.makeCallback();
        if (!utils.includes(threadID, 'Number', 'String')) return log('addUserToGroup', Language('addUsersToGroup', 'wrongType', utils.getType(threadID)));
        if (!Array.isArray(userID)) userID = [userID];
        var messageAndOTID = utils.generateOfflineThreadingID();
        var form = {
            client: 'mecury',
            action_type: 'ma-type:log-message',
            author: 'fbid:' + client.userID,
            thread_id: '',
            timestamp: Date.now(),
            timestamp_absolute: 'Today',
            timestamp_relative: utils.generateTimestampRelative(),
            timestamp_time_passed: '0',
            is_unread: false,
            is_cleared: false,
            is_forward: false,
            is_filterd_content: false,
            is_filterd_content_bh: false,
            is_filterd_content_account: false,
            is_spoof_warning: false,
            source: 'source:chat:web',
            "source_tag[0]": 'source:chat',
            log_message_type: 'log:subscribe',
            status: '0',
            offline_threading_id: messageAndOTID,
            message_id: messageAndOTID,
            threading_id: utils.generateThreadingID((Math.random() * 2147483648 | 0).toString(16)),
            manual_rety_cnt: '0',
            thread_fbid: threadID
        }
        for (let i = 0; i < userID.length; i++) {
            if (!utils.includes(userID[i], 'Number', 'String')) log('addUserToGroup', Language('addUsersToGroup', 'wrongUserIDType', utils.getType(userID[i])), 'error');
            form["log_message_data[added_participants][" + i + "]"] = "fbid:" + userID[i].toString();
        }
        var response = await browser.post('https://www.facebook.com/messaging/send/', form);
        return response || response.error ? callback(response) : callback(null);
    }
}