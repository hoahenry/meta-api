module.exports = function({ requestDefaults, utils, Cli }) {
    const { makeCallback } = utils;
    return async function(content, publish, callback) {
        if (!callback && Function.isFunction(publish)) {
            callback = publish;
            publish = false;
        }
        if (!callback || !Function.isFunction(callback)) callback = makeCallback();
        if (!Boolean.isBoolean(publish)) publish = false;
        if (!String.isString(content)) content = '';
        let form = {
            fb_api_caller_class: "RelayModern",
            fb_api_req_friendly_name: "ProfileCometSetBioMutation",
            doc_id: "2725043627607610",
            variables: JSON.stringify({
                input: {
                    bio: content,
                    publish_bio_feed_story: publish,
                    actor_id: Cli.userID,
                    client_mutation_id: Math.round(Math.random() * 1024).toString()
                },
                hasProfileTileViewID: false,
                profileTileViewID: null,
                scale: 1
            }),
            av: Cli.userID
        };
        let response = await requestDefaults.post('https://www.facebook.com/api/graphql/', form);
        if (!response || response.error) return callback(response);
        return callback(null);
    }
}