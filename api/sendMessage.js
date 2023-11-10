module.exports = function({ browser, client, utils, Language }) {
    var allowedProperties = ['attachments', 'url', 'sticker', 'emoji', 'emojiSize', 'body', 'mentions', 'location'];

    async function uploadAttachments(attachment, callback) {
        try {
            if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();

            let uploads = attachment.map(async function(item) {
                if (!utils.isReadableStream(item)) throw new Error(Language('sendMessage', 'isReadable'));
                let formData = {
                    voice_clip: 'true',
                    upload_1024: item
                }
                let response = await browser.postFormData('https://upload.facebook.com/ajax/mercury/upload.php', formData);
                if (!response) throw Language('sendMessage', 'failedUploadAttachment');
                if (response.error) throw response;
                return response.payload.metadata.shift();
            });

            let results = await Promise.all(uploads);
            return callback(null, results);
        } catch (error) {
            return callback(error, null);
        }
    }

    async function sendContent(form, threadID, isSingleUser, messageAndOTID, callback) {
        if (Array.isArray(threadID)) {
            for (var i = 0; i < threadID.length; i++) form["specific_to_list[" + i + "]"] = "fbid:" + threadID[i];
            form["specific_to_list[" + threadID.length + "]"] = "fbid:" + client.userID;
            form["client_thread_id"] = "root:" + messageAndOTID;
        } else {
            if (isSingleUser) {
                form["specific_to_list[0]"] = "fbid:" + threadID;
                form["specific_to_list[1]"] = "fbid:" + client.userID;
                form["other_user_fbid"] = threadID;
            } else {
                form["thread_fbid"] = threadID;
            }
        }
        
        var response = await browser.post('https://www.facebook.com/messaging/send/', form);
        if (!response) return callback(Language('sendMessage', 'failedSendMessage'))
        if (response.error) return callback(response);
        try {
            var messageInfo = response.payload.actions.reduce((p, v) => {
                return ({ threadID: v.thread_fbid, messageID: v.message_id, timestamp: v.timestamp } || p);
            }, null);
            return callback(null, messageInfo);
        } catch (error) {
            return callback(error, null);
        }
    }

    async function getUrl(url, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
		const form = {
			image_height: 960,
			image_width: 960,
			uri: url
		};
        let response = await browser.post('https://www.facebook.com/message_share_attachment/fromURI/', form);
        return !response ? callback(Language('sendMessage', 'failedGetUrl', url)) : response.error ? callback(response) : callback(null, response.payload.share_data.share_params);
	}

    return async function(message, threadID, replyToMessage, callback) {
        if (String.isString(message)) message = { body: message };
        if (replyToMessage && Function.isFunction(replyToMessage)) {
            callback = replyToMessage;
            replyToMessage = '';
        }
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!String.isString(message) && !Object.isObject(message)) return callback(Language('sendMessage', 'errorMessageType', utils.getType(message)));
        if (!Array.isArray(threadID) && !utils.includes(threadID, 'Number', 'String')) return callback(Language('sendMessage', 'errorThreadIDType', utils.getType(threadID)));
        let disallowedProperties = Object.keys(message).filter(prop => !allowedProperties.includes(prop));
        if (disallowedProperties.length > 0) return callback(Language('sendMessage', 'propertyDisable', disallowedProperties.join(', ')));
        let messageAndOTID = utils.generateOfflineThreadingID();
        var form = {
            client: "mercury",
            action_type: "ma-type:user-generated-message",
            author: "fbid:" + client.userID,
            timestamp: Date.now(),
            timestamp_absolute: "Today",
            timestamp_relative: utils.generateTimestampRelative(),
            timestamp_time_passed: "0",
            is_unread: false,
            is_cleared: false,
            is_forward: false,
            is_filtered_content: false,
            is_filtered_content_bh: false,
            is_filtered_content_account: false,
            is_filtered_content_quasar: false,
            is_filtered_content_invalid_app: false,
            is_spoof_warning: false,
            source: "source:chat:web",
            "source_tags[0]": "source:chat",
            body: message.body ? message.body.toString() : "",
            html_body: false,
            ui_push_phase: "V3",
            status: "0",
            offline_threading_id: messageAndOTID,
            message_id: messageAndOTID,
            threading_id: utils.generateThreadingID((Math.random() * 2147483648 | 0).toString(16)),
            "ephemeral_ttl_mode:": "0",
            manual_retry_cnt: "0",
            has_attachment: !!(message.attachments || message.url || message.sticker),
            signatureID: utils.getSignatureID(),
            replied_to_message_id: replyToMessage
        };
        if (message.location) {
            if (message.location.latitude == null || message.location.longitude == null) return callback(Language('sendMessage', 'wrongLocation'));
            form["location_attachment[coordinates][latitude]"] = message.location.latitude;
            form["location_attachment[coordinates][longitude]"] = message.location.longitude;
            form["location_attachment[is_current_location]"] = !!message.location.current;
        }
        if (message.sticker) form["sticker_id"] = message.sticker;
        if (message.emoji) {
            if (!message.emojiSize) message.emojiSize = 'medium';
            if (form['body'] && form['body'] !== null) return callback(Language('sendMessage', 'bodyNotEmpty'), null);
            form['body'] = message.emoji;
            form["tags[0]"] = "hot_emoji_size:" + message.emojiSize;
        }
        if (message.mentions) {
            message.mentions.forEach((item, index) => {
                if (!String.isString(item.tag)) return callback(Language('sendMessage', 'errorTagType', utils.getType(item.tag)));
                if (!message.body.includes(item.tag)) return callback(Language('sendMessage', 'notFoundTagString', item.tag));
                form["profile_xmd[" + index + "][offset]"] = message.body.indexOf(item.tag);
                form["profile_xmd[" + index + "][length]"] = item.tag.length;
                form["profile_xmd[" + index + "][id]"] = item.id || item.ID || item.userID || 0;
                form["profile_xmd[" + index + "][type]"] = "p";
            });
        }

        async function handleAttachments(_callback) {
            if (!message.attachments) return _callback();
            if (!Array.isArray(message.attachments)) message.attachments = [message.attachments];
            return uploadAttachments(message.attachments, (error, files) => {
                if (error) return callback(error, null);
                files.forEach(function(file, index) {
                    let key = Object.keys(file);
                    let type = key[0];
                    if (!form[type + "s"]) form[type + "s"] = [];
                    form[type + "s"].push(file[type]);
                    if (index + 1 === files.length) return _callback();
                })
            });
        }

        function handleSendURL(_callback) {
            if (!message.url) return _callback();
            form["shareable_attachment[share_type]"] = "100";
            return getUrl(message.url, (error, params) => {
                if (error) return callback(error);
                form["shareable_attachment[share_params]"] = params;
                return _callback();
            });
        }
        
        return await handleAttachments(async function() {
            return await handleSendURL(async function() {
                return await sendContent(form, threadID, threadID.toString().length < 16, messageAndOTID, callback);
            });
        });
    }
}