module.exports = function({ requestDefaults, utils }) {
    const { makeCallback } = utils;
    return async function(emoji, threadID, callback) {
        if (!callback) callback = makeCallback();
        let form = {
            emoji_choice: emoji,
            thread_or_other_fbid: threadID
        }
        let response = await requestDefaults.post('https://www.facebook.com/messaging/save_thread_emoji/?source=thread_settings&__pc=EXP1%3Amessengerdotcom_pkg', form);
        if (!response || response.error) return callback(response);
        return callback(null);
    }
}