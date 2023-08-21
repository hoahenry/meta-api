module.exports = function({ browser, utils }) {
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
            return !response || response.error ? callback(response) : callback(null);
        }
        return !response || response.error ? callback(response) : callback(null, removeTyping)
    }
}