module.exports = function({ requestDefaults, utils, Cli }) {
    var { makeCallback } = utils;
    return async function(nickname, threadID, participantID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = makeCallback();
        var form = {
            nickname: nickname,
            participant_id: participantID,
            thread_or_other_fbid: threadID
        }
        var response = await requestDefaults.post('https://www.facebook.com/messaging/save_thread_nickname/?source=thread_settings&dpr=1', form);
        if (!response || response.error) return callback(response);
        return callback(null);
    }
}