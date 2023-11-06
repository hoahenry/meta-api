module.exports = function({ browser, utils, Language }) {
    return async function(emoji, threadID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        let form = {
            emoji_choice: emoji,
            thread_or_other_fbid: threadID
        }
        let response = await browser.post('https://www.facebook.com/messaging/save_thread_emoji/?source=thread_settings&__pc=EXP1%3Amessengerdotcom_pkg', form);
        return !response ? callback(Language('changeThreadEmoji', 'failedChangeThreadEmoji')) : response.error ? callback(response) : callback(null, response);
    }
}