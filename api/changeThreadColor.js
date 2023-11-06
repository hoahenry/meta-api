module.exports = function({ browser, utils, client, Language }) {
    return async function(color, threadID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!isNaN(color)) color = color.toString();
        let validatedColor = color !== null ? color.toLowerCase() : color;
        let form = {
            dpr: 1,
            queries: JSON.stringify({
                o0: {
                    doc_id: "1727493033983591",
                    query_params: {
                        data: {
                            actor_id: client.userID,
                            client_mutation_id: "0",
                            source: "SETTINGS",
                            theme_id: validatedColor,
                            thread_id: threadID
                        }
                    }
                }
            })
        }
        let response = await browser.post('https://www.facebook.com/api/graphqlbatch/', form);
        return !response ? callback(Language('changeThreadColor', 'failedChangeThreadColor')) : response.error ? callback(response) : callback(null, response);
    }
}