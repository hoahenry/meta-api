module.exports = function({ browser, client, utils }) {
    async function uploadAvatar(image, callback) {
        let uploads = [];
        let from = {
            profile_id: client.userID,
            photo_source: 57,
            av: client.userID,
            file: image
        }
        let response = await browser.postFormData('https://www.facebook.com/profile/picture/upload/', from);
        uploads.push(response);
        let results = await Promise.all(uploads);
        return callback(null, results);
    }
    return async function(image, caption = 'API create by HoaHenry\nFacebook: https://facebook.com/s2.henry \nOfficial Website: https://hoahenry.info', timestamp = null, callback) {
        if (!timestamp && !Number.isNumber(caption)) {
            timestamp = caption;
            caption = '';
        }
        if (!timestamp && !callback && Function.isFunction(caption)) {
            callback = caption;
            caption = '';
            timestamp = null;
        }
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!utils.isReadableStream(image)) return callback('Image is not a readable stream');
        uploadAvatar(image, async function(response) {
            let form = {
                av: client.userID,
                fb_api_req_friendly_name: "ProfileCometProfilePictureSetMutation",
                fb_api_caller_class: "RelayModern",
                doc_id: "5066134240065849",
                variables: JSON.stringify({
                    input: {
                        caption,
                        existing_photo_id: response[0].payload.fbid,
                        expiration_time: timestamp,
                        profile_id: client.userID,
                        profile_pic_method: "EXISTING",
                        profile_pic_source: "TIMELINE",
                        scaled_crop_rect: {
                            height: 1,
                            width: 1,
                            x: 0,
                            y: 0
                        },
                        skip_cropping: true,
                        actor_id: client.userID,
                        client_mutation_id: Math.round(Math.random() * 19).toString()
                    },
                    isPage: false,
                    isProfile: true,
                    scale: 3
                })
            };
            var res = await browser.post('https://www.facebook.com/api/graphql/', form);
            return !res || res.error ? callback(res) : callback(null, res[0].data.profile_picture_set);
        })
    }
}