module.exports = function({ browser, utils, Language }) {
    return async function(photoID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        var response = await browser.get('https://www.facebook.com/mercury/attachments/photo', { photo_id: photoID });
        return !response ? callback(Language('resolvePhotoUrl', 'failedResolve', photoID)) : response.error ? callback(response) : callback(null, resData.jsmods.require[0][3][0]);
    }
}