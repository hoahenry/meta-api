module.exports = function({ browser, utils, Language }) {
    return async function(nickname, threadID, participantID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        var form = {
            nickname: nickname,
            participant_id: participantID,
            thread_or_other_fbid: threadID
        }
        var response = await browser.post('https://www.facebook.com/messaging/save_thread_nickname/?source=thread_settings&dpr=1', form);
        return !response ? callback(Language('changeNickname', 'failedChangeNickname')) : response.error ? callback(response) : callback(null, response);
    }
}