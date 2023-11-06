module.exports = function({ browser, utils, Language }) {
    function getForm(typing, threadID, isGroup) {
        return {
            typ: +typing,
            to: !isGroup ? threadID : '',
            source: 'mercury-chat',
            thread: threadID
        }
    }
    return async function(threadID, isGroup, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        let response = await browser.post('https://www.facebook.com/ajax/messaging/typ.php', getForm(true, threadID, isGroup));
        async function removeTyping(callback) {
            if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
            let response = await browser.post('https://www.facebook.com/ajax/messaging/typ.php', getForm(false, threadID, isGroup));
            return !response ? callback(Language('sendTyping', 'failedRemoveTyping', threadID)) : response.error ? callback(response) : callback(null);
        }
        return !response ? callback(Language('sendTyping', 'failedSendTyping', threadID)) : response.error ? callback(response) : callback(null, removeTyping)
    }
}