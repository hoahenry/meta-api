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
        if (response.error === 1545014) return callback('Trying to change nickname of user isn\'t in thread', false);
        if (response.error === 1357031) return callback('Trying to change user nickname of a thread that doesn\'t exist. Have at least one message in the thread before trying to change the user nickname.', false);
        if (response.error) return callback(response.error, false);
        return callback(null, true)
    }
}