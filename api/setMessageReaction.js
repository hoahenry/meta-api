module.exports = function({ requestDefaults, utils, Cli }) {
    var { makeCallback } = utils;
    return async function(reaction, messageID, callback) {
        if (!callback) callback = makeCallback();
        if (!messageID || !String.isString(messageID)) return callback('Please pass a messageID in the seconds arguments', null);
        if (!Cli.clientMutationID) Cli.clientMutationID = 0
        var qs = {
            doc_id: '1491398900900362',
            variables: JSON.stringify({
                data: {
                    client_mutation_id: Cli.clientMutationID++,
                    actor_id: Cli.userID,
                    action: reaction == '' ? 'REMOVE_REACTION' : 'ADD_REACTION',
                    message_id: messageID,
                    reaction: reaction
                }
            }),
            dpr: 1
        }
        var response = await requestDefaults.postFormData('https://www.facebook.com/webgraphql/mutation/', {}, {}, qs);
        if (!response || response.error) return callback(response);
        return callback(null);
    }
}