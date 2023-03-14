module.exports = function({ requestDefaults, Cli, utils }) {
    const { makeCallback, isReadableStream } = utils;
    const bluebird = require('bluebird');
    async function uploadAvatar(image, callback) {
        let uploads = [];
        let from = {
            profile_id: Cli.userID,
            photo_source: 57,
            av: Cli.userID,
            file: image
        }
        let response = await requestDefaults.postFormData('https://www.facebook.com/profile/picture/upload/', from);
        uploads.push(response);
        bluebird.all(uploads).then(callback);
    }
    return async function(image, caption = '', timestamp = null, callback) {
        if (!timestamp && !Number.isNumber(caption)) {
            timestamp = caption;
            caption = '';
        }
        if (!timestamp && !callback && Function.isFunction(caption)) {
            callback = caption;
            caption = '';
            timestamp = null;
        }
        if (!callback || !Function.isFunction(callback)) callback = makeCallback();
        if (!isReadableStream(image)) return callback('Image is not a readable stream');
        uploadAvatar(image, async function(response) {
            let form = {
                av: Cli.userID,
                fb_api_req_friendly_name: "ProfileCometProfilePictureSetMutation",
                fb_api_caller_class: "RelayModern",
                doc_id: "5066134240065849",
                variables: JSON.stringify({
                    input: {
                        caption,
                        existing_photo_id: response[0].payload.fbid,
                        expiration_time: timestamp,
                        profile_id: Cli.userID,
                        profile_pic_method: "EXISTING",
                        profile_pic_source: "TIMELINE",
                        scaled_crop_rect: {
                            height: 1,
                            width: 1,
                            x: 0,
                            y: 0
                        },
                        skip_cropping: true,
                        actor_id: Cli.userID,
                        client_mutation_id: Math.round(Math.random() * 19).toString()
                    },
                    isPage: false,
                    isProfile: true,
                    scale: 3
                })
            };
            var res = await requestDefaults.post('https://www.facebook.com/api/graphql/', form);
            if (!res || res.error) return callback(res);
            return callback(null, res[0].data.profile_picture_set);
        })
    }
}