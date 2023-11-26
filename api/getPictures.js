module.exports = function({ browser, utils, Language }) {
    return async function(threadID, offset, limit, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        let form = {
            thread_id: threadID,
            offset: offset,
            limit: limit
        }
        let response = await browser.post('https://www.facebook.com/ajax/messaging/attachments/sharedphotos.php', form);
        if (!response) return callback(Language('getPictures', 'failedGetPicture'));
        if (response.error) return callback(response);

        // temporary fix
        return callback(null, response.payload.imagesData);

        let obj = response.payload.map(async function(image) {
            let res = await browser.post('https://www.facebook.com/ajax/messaging/attachments/sharedphotos.php', form);
            if (!res) return callback(Language('getPictures', 'failedGetPicture'));
            if (res.error) return callback(response);
            let queryThreadID = response.jsmods.require[0][3][1].query_metadata.query_path[0].message_thread;
            return response.jsmods.require[0][3][1].query_results[queryThreadID].message_images.edges[0].node.image2
        });
        return callback(null, obj);
    }
}