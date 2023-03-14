module.exports = function({ requestDefaults, utils }) {
    const { makeCallback } = utils;
    return async function(threadID, muteTime, callback) {
        if (!callback || !Function.isFunction(callback)) callback = makeCallback();
        let form = {
            thread_fbid: threadID,
            mute_settings: muteTime
        }
        let response = await requestDefaults.post('https://www.facebook.com/ajax/mercury/change_mute_thread.php', form);
        if (!response || response.error) return callback(response);
        return callback(null);
    }
}