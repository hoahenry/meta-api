module.exports = function({ requestDefaults, utils }) {
    var { makeCallback } = utils;
    function getForm(typing, threadID, isGroup) {
        return {
            typ: +typing,
            to: !isGroup ? threadID : '',
            source: 'mercury-chat',
            thread: threadID
        }
    }
    return async function(threadID, isGroup, callback) {
        if (!callback || !Function.isFunction(callback)) callback = makeCallback();
        let form = getForm(true, threadID, isGroup);
        let response = await requestDefaults.post('https://www.facebook.com/ajax/messaging/typ.php', form);
        if (!response || response.error) return callback(response, null);
        async function removeTyping() {
            let form = getForm(false, threadID, isGroup);
            let response = await requestDefaults.post('https://www.facebook.com/ajax/messaging/typ.php', form);
            if (!response || response.error) return callback(response, null);
        }
        return callback(null, removeTyping);
    }
}