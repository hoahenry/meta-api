module.exports = function({ browser, utils, client, Language }) {
    return async function(content, publish, callback) {
        if (!callback && Function.isFunction(publish)) {
            callback = publish;
            publish = false;
        }
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
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
                    actor_id: client.userID,
                    client_mutation_id: Math.round(Math.random() * 1024).toString()
                },
                hasProfileTileViewID: false,
                profileTileViewID: null,
                scale: 1
            }),
            av: client.userID
        };
        let response = await browser.post('https://www.facebook.com/api/graphql/', form);
        return !response ? callback(Language('setBio', 'failedSetBio')) : response.error ? callback(response) : callback(null);
    }
}