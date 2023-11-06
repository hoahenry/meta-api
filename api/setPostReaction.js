module.exports = function({ browser, utils, client, Language }) {
    let map = {
        unlike: 0,
        like: 1,
        heart: 2,
        love: 16,
        haha: 4,
        wow: 3,
        sad: 7,
        angry: 8
    }
    function formatData(resData) {
        return {
            viewer_feedback_reaction_info: resData.data.feedback_react.feedback.viewer_feedback_reaction_info,
            supported_reactions: resData.data.feedback_react.feedback.supported_reactions,
            top_reactions: resData.data.feedback_react.feedback.top_reactions.edges,
            reaction_count: resData.data.feedback_react.feedback.reaction_count
        };
    }
    return async function(postID, type, callback) {
        if (!callback && Function.isFunction(type)) {
            callback = type;
            type = 0;
        }
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        type = map[type.toLowerCase()] || 1;
        let form = {
            av: client.userID,
            fb_api_caller_class: "RelayModern",
            fb_api_req_friendly_name: "CometUFIFeedbackReactMutation",
            doc_id: "4769042373179384",
            variables: JSON.stringify({
                input: {
                    actor_id: client.userID,
                    feedback_id: Buffer.from('feedback:' + postID).toString("base64"),
                    feedback_reaction: type,
                    feedback_source: "OBJECT",
                    is_tracking_encrypted: true,
                    tracking: [],
                    session_id: "f7dd50dd-db6e-4598-8cd9-561d5002b423",
                    client_mutation_id: Math.round(Math.random() * 19).toString()
                },
                useDefaultActor: false,
                scale: 3
            })
        }
        let response = await browser.post('https://www.facebook.com/api/graphql/', form);
        return !response ? callback(Language('setPostReaction', 'failedSetReaction', postID)) : response.error ? callback(response) : callback(null);
    }
}