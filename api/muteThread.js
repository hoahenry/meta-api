module.exports = function({ browser, utils }) {
    return async function(threadID, muteTime, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        let response = await browser.post('https://www.facebook.com/ajax/mercury/change_mute_thread.php', {
            thread_fbid: threadID,
            mute_settings: muteTime
        });
        return !response || response.error ? callback(response) : callback(null);
    }
}