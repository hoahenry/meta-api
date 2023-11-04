module.exports = function({ browser, utils, client, Language }) {
    return async function(reaction, messageID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!messageID || !String.isString(messageID)) return callback(Language('setMessageReaction', 'needMessageID'), null);
        var form = {
            doc_id: '1491398900900362',
            variables: JSON.stringify({
                data: {
                    client_mutation_id: Math.round(Math.random() * 1024).toString(),
                    actor_id: client.userID,
                    action: reaction == '' ? 'REMOVE_REACTION' : 'ADD_REACTION',
                    message_id: messageID,
                    reaction: reaction
                }
            }),
            dpr: 1
        }
        var response = await browser.postFormData('https://www.facebook.com/webgraphql/mutation/', form);
        return !response || response.error ? callback(response) : callback(null);
    }
}