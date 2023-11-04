module.exports = function({ browser, utils, client, Language }) {
    return async function(participantIDs, title, callback) {
        if (!callback && Function.isFunction(title)) {
            callback = title;
            title = null;
        }
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (participantIDs.length < 2) return callback(Language('createNewGroup', 'needParticipantIDs'));
        var data = {
            input: {
                entry_point: 'jewel_new_group',
                actor_id: client.userID,
                participants: [{ fbid: client.userID }],
                client_mutation_id: Math.round(Math.random() * 1025).toString(),
                thread_settings: {
                    name: title,
                    joinable_mode: 'PRIVATE',
                    thread_image_fbid: null
                }
            }
        }
        for (var i of participantIDs) data.input.participants.push({ fbid: i });
        var form = {
            fb_api_caller_class: 'RelayModern',
            fb_api_req_friendly_name: 'MessengerGroupCreateMutation',
            av: client.userID,
            doc_id: '577041672419534',
            variables: JSON.stringify(data)
        }
        var response = await browser.post('https://www.facebook.com/api/graphql/', form);
        return !response || response.error ? callback(response) : callback(null);
    }
}