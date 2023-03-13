module.exports = function({ requestDefaults, utils, Cli }) {
    var { makeCallback, getGUID, formatID } = utils;
    return async function(name, callback) {
        if (!callback) callback = makeCallback();
        var form = {
            value: name.toLowerCase(),
            viewer: Cli.userID,
            rsp: 'search',
            context: 'search',
            path: '/home.php',
            request_id: getGUID()
        }

        var response = await requestDefaults.get('https://www.facebook.com/ajax/typeahead/search.php', form);
        if (!response || response.error) return callback(response, null);
        var data = response.payload.entries.map(function(data) {
            return {
                userID: formatID(data.uid.toString()),
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