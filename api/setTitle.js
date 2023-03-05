module.exports = function({ requestDefaults, Cli, utils }) {
    var { makeCallback, generateOfflineThreadingID, generateThreadingID, generateTimestampRelative, getType } = utils;
    return async function(newTitle, threadID, callback) {
        if (!callback || Function.isFunction(threadID)) callback('Please pass a threadID as a second argument.');
        if (!callback) callback = makeCallback();
        var messageAndOTID = generateOfflineThreadingID();
        var form = {
            client: "mercury",
            action_type: "ma-type:log-message",
            author: "fbid:" + Cli.userID,
            author_email: "",
            coordinates: "",
            timestamp: Date.now(),
            timestamp_absolute: "Today",
            timestamp_relative: generateTimestampRelative(),
            timestamp_time_passed: "0",
            is_unread: false,
            is_cleared: false,
            is_forward: false,
            is_filtered_content: false,
            is_spoof_warning: false,
            source: "source:chat:web",
            "source_tags[0]": "source:chat",
            status: "0",
            offline_threading_id: messageAndOTID,
            message_id: messageAndOTID,
            threading_id: generateThreadingID(Cli.clientID),
            manual_retry_cnt: "0",
            thread_fbid: threadID,
            thread_name: newTitle,
            thread_id: threadID,
            log_message_type: "log:thread-name"
        };
        var response = await requestDefaults.post('https://www.facebook.com/messaging/set_thread_name/', form);
        if (response.error === 1545012) return callback('Cannot change chat title. This user not is a members in the group', false);
        if (response.error === 1545003) return callback('Cannot set title of single-user chat.', false);
        if (response.error) return callback(response.error, false);
        return callback(null, true);
    }
}