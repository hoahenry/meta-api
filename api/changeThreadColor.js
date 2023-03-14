module.exports = function({ requestDefaults, utils, Cli }) {
    const { makeCallback } = utils;
    return async function(color, threadID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = makeCallback();
        if (!isNaN(color)) color = color.toString();
        let validatedColor = color !== null ? color.toLowerCase() : color;
        let form = {
            dpr: 1,
            queries: JSON.stringify({
                o0: {
                    doc_id: "1727493033983591",
                    query_params: {
                        data: {
                            actor_id: Cli.userID,
                            client_mutation_id: "0",
                            source: "SETTINGS",
                            theme_id: validatedColor,
                            thread_id: threadID
                        }
                    }
                }
            })
        }
        let response = await requestDefaults.post('https://www.facebook.com/api/graphqlbatch/', form);
        if (!response || response.error) return callback(response);
        return callback(null);
    }
}