module.exports = function({ Cli, globalOptions, log }) {
    Function.isFunction = function(v) {
        var type = Object.prototype.toString.call(v).slice(8, -1);
        return type === 'Function' || type === 'AsyncFunction';
    }
    Number.isNumber = function(n) {
        return Object.prototype.toString.call(n).slice(8, -1) === 'Number';
    }
    Object.isObject = function(o) {
        return Object.prototype.toString.call(o).slice(8, -1) === 'Object';
    }
    String.isString = function(s) {
        return Object.prototype.toString.call(o).slice(8, -1) === 'String';
    }
    Boolean.isBoolean = function(b) {
        return Object.prototype.toString.call(o).slice(8, -1) === 'Boolean';
    }

    function includes(data, ...type) {
        return type.includes(Object.prototype.toString.call(data).slice(8, -1));
    }

    function getType(obj) {
        return Object.prototype.toString.call(obj).slice(8, -1);
    }

    function getFrom(str, startToken, endToken) {
        var start = str.indexOf(startToken) + startToken.length;
        if (start < startToken.length) return "";
    
        var lastHalf = str.substring(start);
        var end = lastHalf.indexOf(endToken);
        if (end === -1) return '';
        return lastHalf.substring(0, end);
    }

    function makeParsable(html) {
        const withoutForLoop = html.replace(/for\s*\(\s*;\s*;\s*\)\s*;\s*/, "");
        const maybeMultipleObjects = withoutForLoop.split(/\}\r\n *\{/);
        if (maybeMultipleObjects.length === 1) return maybeMultipleObjects;

        return "[" + maybeMultipleObjects.join("},{") + "]";
    }

    function formatCookie(array, url) {
        return array[0] + "=" + array[1] + "; Path=" + array[3] + "; Domain=" + url + ".com";
    }

    function formatID(id) {
        return id.replace(/(fb)?id[:.]/, "") || id
    }

    function formatDeltaMessage(m) {
        var md = m.messageMetadata;
    
        var mdata = m.data === undefined ? [] : m.data.prng === undefined ? [] : JSON.parse(m.data.prng);
        var m_id = mdata.map(u => u.i);
        var m_offset = mdata.map(u => u.o);
        var m_length = mdata.map(u => u.l);
        var mentions = {};
        for (var i = 0; i < m_id.length; i++) mentions[m_id[i]] = m.body.substring(m_offset[i], m_offset[i] + m_length[i]);
    
        return {
            type: "message",
            senderID: formatID(md.actorFbId.toString()),
            body: m.body || "",
            threadID: formatID((md.threadKey.threadFbId || md.threadKey.otherUserFbId).toString()),
            messageID: md.messageId,
            attachments: (m.attachments || []).map(v => _formatAttachment(v)),
            mentions: mentions,
            timestamp: md.timestamp,
            isGroup: !!md.threadKey.threadFbId
        };
    }

    function getExtension(original_extension, fullFileName = "") {
        if (!original_extension) return fullFileName.split('.').pop() || "";
        else return original_extension;
    }

    function _formatAttachment(attachment1, attachment2) {
        const fullFileName = attachment1.filename;
        const fileSize = Number(attachment1.fileSize || 0);
        const durationVideo = attachment1.genericMetadata ? Number(attachment1.genericMetadata.videoLength) : undefined;
        const durationAudio = attachment1.genericMetadata ? Number(attachment1.genericMetadata.duration) : undefined;
        const mimeType = attachment1.mimeType;
    
        attachment2 = attachment2 || { id: "", image_data: {} };
        attachment1 = attachment1.mercury || attachment1;
        var blob = attachment1.blob_attachment || attachment1.sticker_attachment;
        var type = blob && blob.__typename ? blob.__typename : attachment1.attach_type;
        if (!type && attachment1.sticker_attachment) {
            type = "StickerAttachment";
            blob = attachment1.sticker_attachment;
        } else if (!type && attachment1.extensible_attachment) {
            if (
                attachment1.extensible_attachment.story_attachment &&
                attachment1.extensible_attachment.story_attachment.target &&
                attachment1.extensible_attachment.story_attachment.target.__typename &&
                attachment1.extensible_attachment.story_attachment.target.__typename === "MessageLocation"
            ) {
                type = "MessageLocation";
            } else {
                type = "ExtensibleAttachment";
            }
    
            blob = attachment1.extensible_attachment;
        }
        
        switch (type) {
            case "sticker":
                return {
                    type: "sticker",
                    ID: attachment1.metadata.stickerID.toString(),
                    url: attachment1.url,
    
                    packID: attachment1.metadata.packID.toString(),
                    spriteUrl: attachment1.metadata.spriteURI,
                    spriteUrl2x: attachment1.metadata.spriteURI2x,
                    width: attachment1.metadata.width,
                    height: attachment1.metadata.height,
    
                    caption: attachment2.caption,
                    description: attachment2.description,
    
                    frameCount: attachment1.metadata.frameCount,
                    frameRate: attachment1.metadata.frameRate,
                    framesPerRow: attachment1.metadata.framesPerRow,
                    framesPerCol: attachment1.metadata.framesPerCol,
    
                    stickerID: attachment1.metadata.stickerID.toString(),
                    spriteURI: attachment1.metadata.spriteURI,
                    spriteURI2x: attachment1.metadata.spriteURI2x
                };
            case "file":
                return {
                    type: "file",
                    ID: attachment2.id.toString(),
                    fullFileName: fullFileName,
                    filename: attachment1.name,
                    fileSize: fileSize,
                    original_extension: getExtension(attachment1.original_extension, fullFileName),
                    mimeType: mimeType,
                    url: attachment1.url,
    
                    isMalicious: attachment2.is_malicious,
                    contentType: attachment2.mime_type,
    
                    name: attachment1.name
                };
            case "photo":
                return {
                    type: "photo",
                    ID: attachment1.metadata.fbid.toString(),
                    filename: attachment1.fileName,
                    fullFileName: fullFileName,
                    fileSize: fileSize,
                    original_extension: getExtension(attachment1.original_extension, fullFileName),
                    mimeType: mimeType,
                    thumbnailUrl: attachment1.thumbnail_url,
    
                    previewUrl: attachment1.preview_url,
                    previewWidth: attachment1.preview_width,
                    previewHeight: attachment1.preview_height,
    
                    largePreviewUrl: attachment1.large_preview_url,
                    largePreviewWidth: attachment1.large_preview_width,
                    largePreviewHeight: attachment1.large_preview_height,
    
                    url: attachment1.metadata.url,
                    width: attachment1.metadata.dimensions.split(",")[0],
                    height: attachment1.metadata.dimensions.split(",")[1],
                    name: fullFileName
                };
            case "animated_image":
                return {
                    type: "animated_image",
                    ID: attachment2.id.toString(),
                    filename: attachment2.filename,
                    fullFileName: fullFileName,
                    original_extension: getExtension(attachment2.original_extension, fullFileName),
                    mimeType: mimeType,
    
                    previewUrl: attachment1.preview_url,
                    previewWidth: attachment1.preview_width,
                    previewHeight: attachment1.preview_height,
    
                    url: attachment2.image_data.url,
                    width: attachment2.image_data.width,
                    height: attachment2.image_data.height,
    
                    name: attachment1.name,
                    facebookUrl: attachment1.url,
                    thumbnailUrl: attachment1.thumbnail_url,
                    rawGifImage: attachment2.image_data.raw_gif_image,
                    rawWebpImage: attachment2.image_data.raw_webp_image,
                    animatedGifUrl: attachment2.image_data.animated_gif_url,
                    animatedGifPreviewUrl: attachment2.image_data.animated_gif_preview_url,
                    animatedWebpUrl: attachment2.image_data.animated_webp_url,
                    animatedWebpPreviewUrl: attachment2.image_data.animated_webp_preview_url
                };
            case "share":
                return {
                    type: "share",
                    ID: attachment1.share.share_id.toString(),
                    url: attachment2.href,
    
                    title: attachment1.share.title,
                    description: attachment1.share.description,
                    source: attachment1.share.source,
    
                    image: attachment1.share.media.image,
                    width: attachment1.share.media.image_size.width,
                    height: attachment1.share.media.image_size.height,
                    playable: attachment1.share.media.playable,
                    duration: attachment1.share.media.duration,
    
                    subattachments: attachment1.share.subattachments,
                    properties: {},
    
                    animatedImageSize: attachment1.share.media.animated_image_size,
                    facebookUrl: attachment1.share.uri,
                    target: attachment1.share.target,
                    styleList: attachment1.share.style_list
                };
            case "video":
                return {
                    type: "video",
                    ID: attachment1.metadata.fbid.toString(),
                    filename: attachment1.name,
                    fullFileName: fullFileName,
                    original_extension: getExtension(attachment1.original_extension, fullFileName),
                    mimeType: mimeType,
                    duration: durationVideo,
    
                    previewUrl: attachment1.preview_url,
                    previewWidth: attachment1.preview_width,
                    previewHeight: attachment1.preview_height,
    
                    url: attachment1.url,
                    width: attachment1.metadata.dimensions.width,
                    height: attachment1.metadata.dimensions.height,
    
                    videoType: "unknown",
    
                    thumbnailUrl: attachment1.thumbnail_url
                };
            case "error":
                return {
                    type: "error",
                    attachment1: attachment1,
                    attachment2: attachment2
                };
            case "MessageImage":
                return {
                    type: "photo",
                    ID: blob.legacy_attachment_id,
                    filename: blob.filename,
                    fullFileName: fullFileName,
                    fileSize: fileSize,
                    original_extension: getExtension(blob.original_extension, fullFileName),
                    mimeType: mimeType,
                    thumbnailUrl: blob.thumbnail.uri,
    
                    previewUrl: blob.preview.uri,
                    previewWidth: blob.preview.width,
                    previewHeight: blob.preview.height,
    
                    largePreviewUrl: blob.large_preview.uri,
                    largePreviewWidth: blob.large_preview.width,
                    largePreviewHeight: blob.large_preview.height,
    
                    url: blob.large_preview.uri,
                    width: blob.original_dimensions.x,
                    height: blob.original_dimensions.y,
                    name: blob.filename
                };
            case "MessageAnimatedImage":
                return {
                    type: "animated_image",
                    ID: blob.legacy_attachment_id,
                    filename: blob.filename,
                    fullFileName: fullFileName,
                    original_extension: getExtension(blob.original_extension, fullFileName),
                    mimeType: mimeType,
    
                    previewUrl: blob.preview_image.uri,
                    previewWidth: blob.preview_image.width,
                    previewHeight: blob.preview_image.height,
    
                    url: blob.animated_image.uri,
                    width: blob.animated_image.width,
                    height: blob.animated_image.height,
    
                    thumbnailUrl: blob.preview_image.uri,
                    name: blob.filename,
                    facebookUrl: blob.animated_image.uri,
                    rawGifImage: blob.animated_image.uri,
                    animatedGifUrl: blob.animated_image.uri,
                    animatedGifPreviewUrl: blob.preview_image.uri,
                    animatedWebpUrl: blob.animated_image.uri,
                    animatedWebpPreviewUrl: blob.preview_image.uri
                };
            case "MessageVideo":
                return {
                    type: "video",
                    ID: blob.legacy_attachment_id,
                    filename: blob.filename,
                    fullFileName: fullFileName,
                    original_extension: getExtension(blob.original_extension, fullFileName),
                    fileSize: fileSize,
                    duration: durationVideo,
                    mimeType: mimeType,
    
                    previewUrl: blob.large_image.uri,
                    previewWidth: blob.large_image.width,
                    previewHeight: blob.large_image.height,
    
                    url: blob.playable_url,
                    width: blob.original_dimensions.x,
                    height: blob.original_dimensions.y,
    
                    videoType: blob.video_type.toLowerCase(),
    
                    thumbnailUrl: blob.large_image.uri
                };
            case "MessageAudio":
                return {
                    type: "audio",
                    ID: blob.url_shimhash,
                    filename: blob.filename,
                    fullFileName: fullFileName,
                    fileSize: fileSize,
                    duration: durationAudio,
                    original_extension: getExtension(blob.original_extension, fullFileName),
                    mimeType: mimeType,
    
                    audioType: blob.audio_type,
                    url: blob.playable_url,
    
                    isVoiceMail: blob.is_voicemail
                };
            case "StickerAttachment":
            case "Sticker":
                return {
                    type: "sticker",
                    ID: blob.id,
                    url: blob.url,
    
                    packID: blob.pack ? blob.pack.id : null,
                    spriteUrl: blob.sprite_image,
                    spriteUrl2x: blob.sprite_image_2x,
                    width: blob.width,
                    height: blob.height,
    
                    caption: blob.label,
                    description: blob.label,
    
                    frameCount: blob.frame_count,
                    frameRate: blob.frame_rate,
                    framesPerRow: blob.frames_per_row,
                    framesPerCol: blob.frames_per_column,
    
                    stickerID: blob.id,
                    spriteURI: blob.sprite_image,
                    spriteURI2x: blob.sprite_image_2x
                };
            case "MessageLocation":
                var urlAttach = blob.story_attachment.url;
                var mediaAttach = blob.story_attachment.media;
    
                var u = querystring.parse(url.parse(urlAttach).query).u;
                var where1 = querystring.parse(url.parse(u).query).where1;
                var address = where1.split(", ");
    
                var latitude;
                var longitude;
    
                try {
                    latitude = Number.parseFloat(address[0]);
                    longitude = Number.parseFloat(address[1]);
                } catch (err) {
                    /* empty */
                }
    
                var imageUrl;
                var width;
                var height;
    
                if (mediaAttach && mediaAttach.image) {
                    imageUrl = mediaAttach.image.uri;
                    width = mediaAttach.image.width;
                    height = mediaAttach.image.height;
                }
    
                return {
                    type: "location",
                    ID: blob.legacy_attachment_id,
                    latitude: latitude,
                    longitude: longitude,
                    image: imageUrl,
                    width: width,
                    height: height,
                    url: u || urlAttach,
                    address: where1,
    
                    facebookUrl: blob.story_attachment.url,
                    target: blob.story_attachment.target,
                    styleList: blob.story_attachment.style_list
                };
            case "ExtensibleAttachment":
                return {
                    type: "share",
                    ID: blob.legacy_attachment_id,
                    url: blob.story_attachment.url,
    
                    title: blob.story_attachment.title_with_entities.text,
                    description:
                        blob.story_attachment.description &&
                        blob.story_attachment.description.text,
                    source: blob.story_attachment.source
                        ? blob.story_attachment.source.text
                        : null,
    
                    image:
                        blob.story_attachment.media &&
                        blob.story_attachment.media.image &&
                        blob.story_attachment.media.image.uri,
                    width:
                        blob.story_attachment.media &&
                        blob.story_attachment.media.image &&
                        blob.story_attachment.media.image.width,
                    height:
                        blob.story_attachment.media &&
                        blob.story_attachment.media.image &&
                        blob.story_attachment.media.image.height,
                    playable:
                        blob.story_attachment.media &&
                        blob.story_attachment.media.is_playable,
                    duration:
                        blob.story_attachment.media &&
                        blob.story_attachment.media.playable_duration_in_ms,
                    playableUrl:
                        blob.story_attachment.media == null
                            ? null
                            : blob.story_attachment.media.playable_url,
    
                    subattachments: blob.story_attachment.subattachments,
                    properties: blob.story_attachment.properties.reduce(function (obj, cur) {
                        obj[cur.key] = cur.value.text;
                        return obj;
                    }, {}),
    
                    facebookUrl: blob.story_attachment.url,
                    target: blob.story_attachment.target,
                    styleList: blob.story_attachment.style_list
                };
            case "MessageFile":
                return {
                    type: "file",
                    ID: blob.message_file_fbid,
                    fullFileName: fullFileName,
                    filename: blob.filename,
                    fileSize: fileSize,
                    mimeType: blob.mimetype,
                    original_extension: blob.original_extension || fullFileName.split(".").pop(),
    
                    url: blob.url,
                    isMalicious: blob.is_malicious,
                    contentType: blob.content_type,
    
                    name: blob.filename
                };
            default:
                throw new Error("unrecognized attach_file of type " + type + "`" + JSON.stringify(attachment1, null, 4) + " attachment2: " + JSON.stringify(attachment2, null, 4) + "`");
        }
    }

    function decodeClientPayload(payloadData) {
        return JSON.parse(String.fromCharCode.apply(null, payloadData));
    }

    function formatDeltaReadReceipt(delta) {
        return {
            reader: delta.threadKey.otherUserFbId || delta.actorFbId,
            time: delta.actionTimestampMs,
            threadID: formatID(delta.threadKey.otherUserFbId || delta.threadKey.threadFbId),
            type: "read_receipt"
        };
    }

    function formatDeltaEvent(m) {
        var logMessageType;
        var logMessageData;
        if (m.class == 'AdminTextMessage') {
            logMessageData = m.untypedData;
            logMessageType = getAdminTextMessageType(m.type);
        }
        if (m.class == 'ThreadName') {
            logMessageType = "log:thread-name";
            logMessageData = { name: m.name };
        }
        if (m.class == 'ParticipantsAddedToGroupThread') {
            logMessageType = "log:subscribe";
            logMessageData = { addedParticipants: m.addedParticipants };
        }
        if (m.class == 'ParticipantLeftGroupThread') {
            logMessageType = "log:unsubscribe";
            logMessageData = { leftParticipantFbId: m.leftParticipantFbId };
        }
        if (m.class == 'ApprovalQueue') {
            logMessageType = "log:approval-queue";
            logMessageData = {
                approvalQueue: {
                    action: m.action,
                    recipientFbId: m.recipientFbId,
                    requestSource: m.requestSource,
                    ...m.messageMetadata
                }
            };
        }
    
        return {
            type: "event",
            threadID: formatID(m.messageMetadata.threadKey.threadFbId || m.messageMetadata.threadKey.otherUserFbId),
            messageID: m.messageMetadata.messageId.toString(),
            logMessageType: logMessageType,
            logMessageData: logMessageData,
            logMessageBody: m.messageMetadata.adminText,
            timestamp: m.messageMetadata.timestamp,
            author: m.messageMetadata.actorFbId
        };
    }

    function getAdminTextMessageType(type) {
        var form = {
            change_thread_theme: 'log:thread-color',
            change_thread_icon: 'log:thread-icon',
            change_thread_nickname: 'log:user-nickname',
            change_thread_admins: 'log:thread-admins',
            group_poll: 'log:thread-poll',
            change_thread_approval_mode: 'log:thread-approval-mode',
            messenger_call_log: 'log:thread-call',
            participant_joined_group_call: 'log:thread-call'
        }
        return form[type] || type;
    }

    function isReadableStream(obj) {
        return (obj instanceof _stream.Stream && (getType(obj._read) === 'Function' || getType(obj._read) == 'AsyncFunction') && getType(obj._readableState) == 'Object');
    }

    function generateOfflineThreadingID() {
        var ret = Date.now();
        var value = Math.floor(Math.random() * 4294967295);
        var str = ("0000000000000000000000" + value.toString(2)).slice(-22);
        var msgs = ret.toString(2) + str;
        return binaryToDecimal(msgs);
    }

    function binaryToDecimal(data) {
        var ret = "";
        while (data !== "0") {
            var end = 0;
            var fullName = "";
            for (let i = 0; i < data.length; i++) {
                end = 2 * end + parseInt(data[i], 10);
                if (end >= 10) {
                    fullName += "1";
                    end -= 10;
                } else {
                    fullName += "0";
                }
            }
            ret = end.toString() + ret;
            data = fullName.slice(fullName.indexOf("1"));
        }
        return ret;
    }

    function generateTimestampRelative() {
        var d = new Date();
        return d.getHours() + ":" + padZeros(d.getMinutes());
    }

    function padZeros(val, len) {
        val = String(val);
        len = len || 2;
        while (val.length < len) val = "0" + val;
        return val;
    }

    function generateThreadingID(clientID) {
        var k = Date.now();
        var l = Math.floor(Math.random() * 4294967295);
        var m = clientID;
        return "<" + k + ":" + l + "-" + m + "@mail.projektitan.com>";
    }
    
    function getSignatureID() {
        return Math.floor(Math.random() * 2147483648).toString(16);
    }

    function makeCallback() {
        return function(error, data) {
            if (error) return error;
            else return data
        }
    }

    function getGUID() {
        var sectionLength = Date.now();
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(item) {
            var r = Math.floor((sectionLength + Math.random() * 16) % 16);
            sectionLength = Math.floor(sectionLength / 16);
            var _guid = (item == "x" ? r : (r & 7) | 8).toString(16);
            return _guid;
        })
    }

    function getTime(format = 'HH:mm:ss DD/MM/YYYY') {
        const _moment = require("moment-timezone").tz("Asia/Ho_Chi_Minh");
        return _moment.format(format)
    }

    return {
        includes,
        getType,
        getFrom,
        getTime,
        getGUID,
        formatID,
        padZeros,
        makeCallback,
        getSignatureID,
        binaryToDecimal,
        formatDeltaEvent,
        isReadableStream,
        _formatAttachment,
        formatDeltaMessage,
        decodeClientPayload,
        generateThreadingID,
        formatDeltaReadReceipt,
        getAdminTextMessageType,
        generateTimestampRelative,
        generateOfflineThreadingID
    }
}