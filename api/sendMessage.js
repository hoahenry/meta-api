module.exports = function({ requestDefaults, Cli, utils }) {
    var bluebird = require('bluebird');
    var allowedProperties = ['attachments', 'url', 'sticker', 'emoji', 'emojiSize', 'body', 'mentions', 'location'];
    var { getType, generateOfflineThreadingID, generateTimestampRelative, generateThreadingID, getSignatureID } = utils;
    
    async function uploadAttachment(attachments, callback) {
        var uploads = [];

        for (let i of attachments) {
            if (!utils.isReadableStream(i)) return callback('Attachment should be a readable stream');
            var form = {
                upload_1024: i,
                voice_clip: 'true'
            }

            try {
                var response = await requestDefaults.postFormData('https://upload.facebook.com/ajax/mercury/upload.php', form);
                if (!response || response.error) return callback(response);
                uploads.push(response.payload.metadata[0]);
            } catch (error) {
                return callback(error, null)
            }
        }

        bluebird.all(uploads)
        .then((response) => {
            return callback(null, response);
        })
        .catch((error) => {
            return callback(error, null)
        })
    }

    async function sendContent(form, threadID, isSingleUser, messageAndOTID, callback) {
        if (Array.isArray(threadID)) {
            for (var i = 0; i < threadID.length; i++) {
                form["specific_to_list[" + i + "]"] = "fbid:" + threadID[i];
            }
            form["specific_to_list[" + threadID.length + "]"] = "fbid:" + Cli.userID;
            form["client_thread_id"] = "root:" + messageAndOTID;
        } else {
            if (isSingleUser) {
                form["specific_to_list[0]"] = "fbid:" + threadID;
                form["specific_to_list[1]"] = "fbid:" + Cli.userID;
                form["other_user_fbid"] = threadID;
            } else {
                form["thread_fbid"] = threadID;
            }
        }
        
        var response = await requestDefaults.post('https://www.facebook.com/messaging/send/', form);
        if (!response || response.error) return callback(response, null);

        try {
            var messageInfo = response.payload.actions.reduce((p, v) => {
                return ({ threadID: v.thread_fbid, messageID: v.message_id, timestamp: v.timestamp } || p);
            }, null);
            return callback(null, messageInfo);
        } catch (error) {
            return callback(error, null);
        }
    }

    return async function(message, threadID, replyToMessage, callback, isGroup) {
        if (typeof isGroup == 'undefined') isGroup = null;
        var msgType = getType(message);
        var threadIDType = getType(threadID);
        var messageIDType = getType(replyToMessage);
        if (msgType == 'String') message = { body: message };
        if (messageIDType == 'AsyncFunction' || messageIDType == 'Function') {
            callback = replyToMessage;
            replyToMessage = '';
        }
        if (!callback) callback = utils.makeCallback();
        if (msgType !== "String" && msgType !== "Object") return callback('Message should be of type string or object and not ' + msgType + '.', null);
        if (threadIDType !== 'Array' && threadIDType !== 'Number' && threadIDType !== 'String') return callback('ThreadID should be of type number, string, or array and not ' + threadIDType, null);
        var disallowedProperties = Object.keys(message).filter(prop => !allowedProperties.includes(prop));
        if (disallowedProperties.length > 0) return callback('Dissallowed props: ' + disallowedProperties.join(', '), null);
        var messageAndOTID = generateOfflineThreadingID();
        var form = {
            client: "mercury",
            action_type: "ma-type:user-generated-message",
            author: "fbid:" + Cli.userID,
            timestamp: Date.now(),
            timestamp_absolute: "Today",
            timestamp_relative: generateTimestampRelative(),
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
            threading_id: generateThreadingID(Cli.clientID),
            "ephemeral_ttl_mode:": "0",
            manual_retry_cnt: "0",
            has_attachment: !!(message.attachments || message.url || message.sticker),
            signatureID: getSignatureID(),
            replied_to_message_id: replyToMessage
        };
        
        if (message.location) {
            if (message.location.latitude == null || message.location.longitude == null) return callback('location property needs both latitude and longitude');
            form["location_attachment[coordinates][latitude]"] = message.location.latitude;
            form["location_attachment[coordinates][longitude]"] = message.location.longitude;
            form["location_attachment[is_current_location]"] = !!message.location.current;
        }
        if (message.sticker) form["sticker_id"] = message.sticker;
        if (message.emoji) {
            if (!message.emojiSize) message.emojiSize = 'medium';
            if (form['body'] !== null && form['body']) return callback('Body is not Empty', null);
            form['body'] = message.emoji;
            form["tags[0]"] = "hot_emoji_size:" + message.emojiSize;
        }
        if (message.mentions) {
            Object.keys(message.mentions).map((v, i) => {
                if (!String.isString(v)) return callback('Mention tags must be strings', null);
                let offset = message.body.indexOf(message.mentions[v]);
                if (offset < 0) return callback('Mention for ' + tag + 'not found in message', null);
                form["profile_xmd[" + i + "][offset]"] = offset;
                form["profile_xmd[" + i + "][length]"] = message.mentions[v].length;
                form["profile_xmd[" + i + "][id]"] = v || 0;
                form["profile_xmd[" + i + "][type]"] = "p";
            })
        }

        async function handleAttachments(_callback) {
            if (!message.attachments) return _callback();
            else {
                form["image_ids"] = [];
                form["gif_ids"] = [];
                form["file_ids"] = [];
                form["video_ids"] = [];
                form["audio_ids"] = [];
                if (utils.getType(message.attachments) !== "Array") message.attachments = [message.attachments];
                return uploadAttachment(message.attachments, (error, files) => {
                    if (error) return callback(error, null);
                    else {
                        files.forEach(function(file) {
                            let key = Object.keys(file);
                            let type = key[0];
                            form["" + type + "s"].push(file[type])
                        })
                        return _callback();
                    }
                })
            }
        }
        async function handleUrl(_callback) {
            if (!message.url) return _callback();
            else {
                form["shareable_attachment[share_type]"] = "100";
                return getUrl(message.url, (error, params) => {
                    if (error) return callback(error, null);
                    else {
                        form["shareable_attachment[share_params]"] = params;
                        return _callback();
                    }
                })
            }
        }

        handleAttachments(() => {
            handleUrl(() => {
                if (Array.isArray(threadID)) return sendContent(form, threadID, false, messageAndOTID, callback);
                else {
                    if (!Boolean.isBoolean(isGroup)) return sendContent(form, threadID, threadID.toString().length < 16, messageAndOTID, callback);
                    else return sendContent(form, threadID, !isGroup, messageAndOTID, callback);
                }
            })
        })
    }
}