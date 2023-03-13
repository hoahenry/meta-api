module.exports = function({ requestDefaults, Cli, utils, log }) {
    var { includes, getType, makeCallback, generateOfflineThreadingID, generateTimestampRelative, generateThreadingID, parseAndCheckLogin } = utils;
    return async function(userID, threadID, callback) {
        if (!callback && Function.isFunction(threadID)) return log('addUserToGroup', 'Please pass a threadID as a second argument.', 'warn');
        if (!callback) callback = makeCallback();
        if (!includes(threadID, 'Number', 'String')) return log('addUserToGroup', 'ThreadID should be of type Number or String and not ' + getType(threadID) + '.');
        if (!Array.isArray(userID)) userID = [userID];
        var messageAndOTID = generateOfflineThreadingID();
        var form = {
            client: 'mecury',
            action_type: 'ma-type:log-message',
            author: 'fbid:' + Cli.userID,
            thread_id: '',
            timestamp: Date.now(),
            timestamp_absolute: 'Today',
            timestamp_relative: generateTimestampRelative(),
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
            threading_id: generateThreadingID(Cli.clientID),
            manual_rety_cnt: '0',
            thread_fbid: threadID
        }
        for (let i = 0; i < userID.length; i++) {
            if (!['Number', 'String'].includes(getType(userID[i]))) log('addUserToGroup', 'Elements of userID should be of type Number or String and not ' + getType(userID[i]) + '.', 'error');
            form["log_message_data[added_participants][" + i + "]"] = "fbid:" + userID[i];
        }
        var response = await requestDefaults.post('https://www.facebook.com/messaging/send/', form);
        if (!response || response.error) return callback(response, null);
        return callback(null, true);
    }
}