module.exports = function({ requestDefaults, Cli, utils }) {
    const { makeCallback } = utils;
    return async function(threadID, offset, limit, callback) {
        if (!callback || !Function.isFunction(callback)) callback = makeCallback();
        let form = {
            thread_id: threadID,
            offset: offset,
            limit: limit
        }
        let response = await requestDefaults.post('https://www.facebook.com/ajax/messaging/attachments/sharedphotos.php', form);
        if (!response || response.error) return callback(response);
        let obj = [];
        for (let image of response.payload.imagesData) {
            let form = {
                thread_id: threadID,
                image_id: image.fbid
            }
            let response = await requestDefaults.post('https://www.facebook.com/ajax/messaging/attachments/sharedphotos.php', form);
            if (!response || response.error) return callback(response);
            let queryThreadID = response.jsmods.require[0][3][1].query_metadata.query_path[0].message_thread;
            obj.push(response.jsmods.require[0][3][1].query_results[queryThreadID].message_images.edges[0].node.image2);
        }
        return callback(null, obj);
    }
}