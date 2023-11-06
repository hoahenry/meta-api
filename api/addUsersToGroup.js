module.exports = function ({ browser, client, utils, log, Language }) {
    return async function (userID, threadID, callback) {
        if (!callback && Function.isFunction(threadID)) return log('addUserToGroup', Language('addUsersToGroup', 'needThreadID'), 'warn');
        if (!callback) callback = utils.makeCallback();
        if (!utils.includes(threadID, 'Number', 'String')) return log('addUserToGroup', Language('addUsersToGroup', 'wrongType', utils.getType(threadID)));
        if (!Array.isArray(userID)) userID = [userID];
        var messageAndOTID = utils.generateOfflineThreadingID();
        var form = {
            client: "mercury",
            action_type: "ma-type:log-message",
            author: "fbid:" + client.userID,
            thread_id: "",
            timestamp: Date.now(),
            timestamp_absolute: "Today",
            timestamp_relative: utils.generateTimestampRelative(),
            timestamp_time_passed: "0",
            is_unread: false,
            is_cleared: false,
            is_forward: false,
            is_filtered_content: false,
            is_filtered_content_bh: false,
            is_filtered_content_account: false,
            is_spoof_warning: false,
            source: "source:chat:web",
            "source_tags[0]": "source:chat",
            log_message_type: "log:subscribe",
            status: "0",
            offline_threading_id: messageAndOTID,
            message_id: messageAndOTID,
            threading_id: utils.generateThreadingID((Math.random() * 2147483648 | 0).toString(16)),
            manual_retry_cnt: "0",
            thread_fbid: threadID
        };
        userID.forEach(function(item, index) {
            if (!utils.includes(item, 'Number', 'String')) return log('addUserToGroup', Language('addUsersToGroup', 'wrongUserIDType', utils.getType(item)), 'error');
            form["log_message_data[added_participants][" + index + "]"] = "fbid:" + item.toString();
        })
        var response = await browser.post('https://www.facebook.com/messaging/send/', form);
        return !response ? callback(Language('addUsersToGroup', 'addFailed')) : response.error ? callback(response) : callback(null, response);
    }
}