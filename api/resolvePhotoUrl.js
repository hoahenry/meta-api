module.exports = function({ requestDefaults, utils }) {
    var { makeCallback } = utils;
    return async function(photoID, callback) {
        if (!callback) callback = makeCallback();
        var response = await requestDefaults.get('https://www.facebook.com/mercury/attachments/photo', { photo_id: photoID });
        if (!response || response.error) return callback(response, null)
        var photoUrl = resData.jsmods.require[0][3][0];
        return callback(null, photoUrl);
    }
}