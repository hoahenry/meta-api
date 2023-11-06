module.exports = function({ browser, utils, client, Language }) {
    return async function(name, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        var form = {
            value: name.toLowerCase(),
            viewer: client.userID,
            rsp: 'search',
            context: 'search',
            path: '/home.php',
            request_id: utils.getGUID()
        }

        var response = await browser.get('https://www.facebook.com/ajax/typeahead/search.php', form);
        if (!response) return callback(Language('searchUsers', 'failedSearch', name));
        if (response.error) return callback(response);
        var data = response.payload.entries.map(function(data) {
            return {
                userID: utils.formatID(data.uid.toString()),
                photoUrl: data.photo,
                indexRank: data.index_rank,
                name: data.text,
                isVerified: data.isVerified,
                profileUrl: data.path,
                category: data.category,
                score: data.score,
                type: data.type
            }
        });
        return callback(null, data)
    }
}