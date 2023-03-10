module.exports = function({ requestDefaults, api, Cli, utils, log, globalOptions, jar }) {
    const mqtt = require('mqtt'), ws = require('websocket-stream');
    var { formatDeltaMessage, formatID, getGUID, formatDeltaEvent, _formatAttachment, decodeClientPayload } = utils;
    var form = {
        "av": globalOptions.pageID,
        "queries": JSON.stringify({
            "o0": {
                "doc_id": "3336396659757871",
                "query_params": {
                    "limit": 1,
                    "before": null,
                    "tags": ["INBOX"],
                    "includeDeliveryReceipts": false,
                    "includeSeqID": true
                }
            }
        })
    };
    
    async function getSeqID(callback) {
        var response = await requestDefaults.post('https://www.facebook.com/api/graphqlbatch/', form);
        if (!Array.isArray(response)) return log('LSITENER', 'Not Logged in.', 'error');
        Cli.irisSeqID = response[0].o0.data.viewer.message_threads.sync_sequence_id;
        if (callback) callback();
    };

    async function parseDelta(callback, deltas) {
        switch (deltas.class) {
            case 'NewMessage': {
                try {
                    if (deltas.attachments.length > 0) {
                        for (let i of deltas.attachments) {
                            if (i.mercury.attach_type == "photo") {
                                api.resolvePhotoUrl(i.fbid, (error, url) => {
                                    if (!error) i.mercury.metadata.url = url;
                                })
                            }
                        }
                    }
                    var formatMessage = formatDeltaMessage(deltas);
                    if (globalOptions.autoMarkRead) api.markRead(formatMessage.threadID);
                    if (globalOptions.selfListen || !globalOptions.selfListen && formatMessage.senderID !== Cli.userID) callback(null, formatMessage);
                } catch (error) {
                    callback(error, null);
                }
                break;
            }
            case 'ClientPayload': {
                var clientPayload = decodeClientPayload(deltas.payload);
                if (clientPayload && clientPayload.deltas) {
                    for (var i in clientPayload.deltas) {
                        var delta = clientPayload.deltas[i];
                        if (delta.deltaMessageReaction && !!globalOptions.listenEvents) {
                            callback(null, {
                                type: "message_reaction",
                                threadID: delta.deltaMessageReaction.threadKey.threadFbId ? delta.deltaMessageReaction.threadKey.threadFbId.toString() : delta.deltaMessageReaction.threadKey.otherUserFbId.toString(),
                                messageID: delta.deltaMessageReaction.messageId,
                                reaction: delta.deltaMessageReaction.reaction,
                                senderID: delta.deltaMessageReaction.senderId == 0 ? delta.deltaMessageReaction.userId.toString() : delta.deltaMessageReaction.senderId.toString(),
                                userID: delta.deltaMessageReaction.userId.toString() || delta.deltaMessageReaction.senderId.toString()
                            })
                        }
                        if (delta.deltaRecallMessageData && !!globalOptions.listenEvents) {
                            callback(null, {
                                type: "message_unsend",
                                threadID: delta.deltaRecallMessageData.threadKey.threadFbId ? delta.deltaRecallMessageData.threadKey.threadFbId.toString() : delta.deltaRecallMessageData.threadKey.otherUserFbId.toString(),
                                messageID: delta.deltaRecallMessageData.messageID,
                                senderID: delta.deltaRecallMessageData.senderID.toString(),
                                deletionTimestamp: delta.deltaRecallMessageData.deletionTimestamp,
                                timestamp: delta.deltaRecallMessageData.timestamp
                            })
                        }
                        if (delta.deltaMessageReply) {
                            var mdata = delta.deltaMessageReply.message === undefined ? [] : delta.deltaMessageReply.message.data === undefined ? [] : delta.deltaMessageReply.message.data.prng === undefined ? [] : JSON.parse(delta.deltaMessageReply.message.data.prng);
                            var m_id = mdata.map(u => u.i);
                            var m_offset = mdata.map(u => u.o);
                            var m_length = mdata.map(u => u.l);

                            var mentions = {};

                            for (var i = 0; i < m_id.length; i++) {
                                mentions[m_id[i]] = (delta.deltaMessageReply.message.body || "").substring(m_offset[i], m_offset[i] + m_length[i]);
                            }

                            var callbackToReturn = {
                                type: "message_reply",
                                threadID: delta.deltaMessageReply.message.messageMetadata.threadKey.threadFbId ? delta.deltaMessageReply.message.messageMetadata.threadKey.threadFbId.toString() : delta.deltaMessageReply.message.messageMetadata.threadKey.otherUserFbId.toString(),
                                messageID: delta.deltaMessageReply.message.messageMetadata.messageId,
                                senderID: delta.deltaMessageReply.message.messageMetadata.actorFbId.toString(),
                                attachments: delta.deltaMessageReply.message.attachments.map(function (att) {
                                    var mercury = JSON.parse(att.mercuryJSON);
                                    Object.assign(att, mercury);
                                    return att;
                                }).map(att => {
                                    var x;
                                    try {
                                        x = _formatAttachment(att);
                                    } catch (ex) {
                                        x = att;
                                        x.error = ex;
                                        x.type = "unknown";
                                    }
                                    return x;
                                }),
                                body: delta.deltaMessageReply.message.body || "",
                                isGroup: !!delta.deltaMessageReply.message.messageMetadata.threadKey.threadFbId,
                                mentions: mentions,
                                timestamp: delta.deltaMessageReply.message.messageMetadata.timestamp
                            };

                            if (delta.deltaMessageReply.repliedToMessage) {
                                mdata = delta.deltaMessageReply.repliedToMessage === undefined ? [] : delta.deltaMessageReply.repliedToMessage.data === undefined ? [] : delta.deltaMessageReply.repliedToMessage.data.prng === undefined ? [] : JSON.parse(delta.deltaMessageReply.repliedToMessage.data.prng);
                                m_id = mdata.map(u => u.i);
                                m_offset = mdata.map(u => u.o);
                                m_length = mdata.map(u => u.l);
    
                                var rmentions = {};    
                                for (var i = 0; i < m_id.length; i++) {
                                    rmentions[m_id[i]] = (delta.deltaMessageReply.repliedToMessage.body || "").substring(m_offset[i], m_offset[i] + m_length[i]);
                                }
                                
                                callbackToReturn.messageReply = {
                                    threadID: delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.threadFbId ? delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.threadFbId.toString() : delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.otherUserFbId.toString(),
                                    messageID: delta.deltaMessageReply.repliedToMessage.messageMetadata.messageId,
                                    senderID: delta.deltaMessageReply.repliedToMessage.messageMetadata.actorFbId.toString(),
                                    attachments: delta.deltaMessageReply.repliedToMessage.attachments.map(function (att) {
                                        var mercury = JSON.parse(att.mercuryJSON);
                                        Object.assign(att, mercury);
                                        return att;
                                    }).map(att => {
                                        var x;
                                        try {
                                            x = _formatAttachment(att);
                                        } catch (ex) {
                                            x = att;
                                            x.error = ex;
                                            x.type = "unknown";
                                        }
                                        return x;
                                    }),
                                    body: delta.deltaMessageReply.repliedToMessage.body || "",
                                    isGroup: !!delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.threadFbId,
                                    mentions: rmentions,
                                    timestamp: delta.deltaMessageReply.repliedToMessage.messageMetadata.timestamp
                                };
                            }
                            if (delta.deltaMessageReply.replyToMessageId) {
                                var response = await requestDefaults.post('https://www.facebook.com/api/graphqlbatch/', {
                                    "av": globalOptions.pageID,
                                    "queries": JSON.stringify({
                                        "o0": {
                                            "doc_id": "2848441488556444",
                                            "query_params": {
                                                "thread_and_message_id": {
                                                    "thread_id": callbackToReturn.threadID,
                                                    "message_id": delta.deltaMessageReply.replyToMessageId.id
                                                }
                                            }
                                        }
                                    })
                                });
                                if (response[response.length - 1].error_results > 0 || response[response.length - 1].successful_results === 0) return callback(response, null)

                                var fetchData = response[0].o0.data.message;
                                var mobj = {};
                                for (var i in fetchData.message.ranges) {
                                    mobj[fetchData.message.ranges[i].entity.id] = (fetchData.message.text || "").substr(fetchData.message.ranges[i].offset, fetchData.message.ranges[i].length);
                                }

                                callbackToReturn.messageReply = {
                                    threadID: callbackToReturn.threadID,
                                    messageID: fetchData.message_id,
                                    senderID: fetchData.message_sender.id,
                                    attachments: fetchData.message.blob_attachment.map(att => {
                                        var x;
                                        try {
                                            x = _formatAttachment({
                                                blob_attachment: att
                                            });
                                        } catch (ex) {
                                            x = att;
                                            x.error = ex;
                                            x.type = "unknown";
                                        }
                                        return x;
                                    }),
                                    body: fetchData.message.text || "",
                                    isGroup: callbackToReturn.isGroup,
                                    mentions: mobj,
                                    timestamp: parseInt(fetchData.timestamp_precise)
                                };
                            }
                            if (globalOptions.autoMarkRead) api.markRead(callbackToReturn.threadID);
                            if (globalOptions.selfListen || !globalOptions.selfListen && callbackToReturn.senderID !== Cli.userID) callback(null, callbackToReturn);
                        }
                    }
                    break;
                }
            }
            case 'ReadReceipt': {
                if (globalOptions.readReceipt) {
                    try {
                        var formatMessage = formatDeltaReadReceipt(deltas);
                        callback(null, formatMessage)
                    } catch (error) {
                        callback(error, null)
                    }
                }
                break;
            }
            case 'AdminTextMessage': {
                var type = ['change_thread_theme', 'change_thread_nickname', 'change_thread_icon', 'change_thread_admins', 'group_poll'];
                if (type.includes(deltas.type) && globalOptions.listenEvents) {
                    try {
                        var formatMessage = formatDeltaEvent(deltas);
                        callback(null, formatMessage);
                    } catch (error) {
                        callback(error, null)
                    }
                }
                break;
            }
            case 'ForcedFetch': {
                if (deltas.threadKey && globalOptions.listenEvents) { 
                    var mid = deltas.messageId;
                    var tid = (deltas.threadKey.threadFbId || deltas.threadKey.otherUserFbId).toString();
                    if (mid && tid) {
                        const form = {
                            "av": globalOptions.pageID,
                            "queries": JSON.stringify({
                                "o0": {
                                    "doc_id": "2848441488556444",
                                    "query_params": {
                                        "thread_and_message_id": {
                                            "thread_id": tid,
                                            "message_id": mid
                                        }
                                    }
                                }
                            })
                        };

                        var response = await requestDefaults.post('https://www.facebook.com/api/graphqlbatch/', form);
                        if (response[response.length - 1].error_results > 0 || response[response.length - 1].successful_results === 0) return callback(response, null);
                        if (Object.isObject(response)) {
                            if (response.__typename == 'ThreadImageMessage') {
                                if (globalOptions.selfListenEvents && response.message_sender.id == Cli.userID) {
                                    callback(null, {
                                        type: "event",
                                        threadID: formatID(tid.toString()),
                                        messageID: response.message_id,
                                        logMessageType: "log:thread-image",
                                        logMessageData: {
                                            attachmentID: response.image_with_metadata && response.image_with_metadata.legacy_attachment_id,
                                            width: response.image_with_metadata && response.image_with_metadata.original_dimensions.x,
                                            height: response.image_with_metadata && response.image_with_metadata.original_dimensions.y,
                                            url: response.image_with_metadata && response.image_with_metadata.preview.uri
                                        },
                                        logMessageBody: response.snippet,
                                        timestamp: response.timestamp_precise,
                                        author: response.message_sender.id
                                    })
                                }
                            }

                            if (response.__typename == 'UserMessage') {
                                callback(null, {
                                    type: "message",
                                    senderID: formatID(response.message_sender.id),
                                    body: response.message.text || "",
                                    threadID: formatID(tid.toString()),
                                    messageID: response.message_id,
                                    attachments: [{
                                        type: "share",
                                        ID: response.extensible_attachment.legacy_attachment_id,
                                        url: response.extensible_attachment.story_attachment.url,

                                        title: response.extensible_attachment.story_attachment.title_with_entities.text,
                                        description: response.extensible_attachment.story_attachment.description.text,
                                        source: response.extensible_attachment.story_attachment.source,

                                        image: response.extensible_attachment.story_attachment.media && response.extensible_attachment.story_attachment.media.image ? response.extensible_attachment.story_attachment.media.image.uri : '',
                                        width: response.extensible_attachment.story_attachment.media && response.extensible_attachment.story_attachment.media.image ? response.extensible_attachment.story_attachment.media.image.width : '',
                                        height: response.extensible_attachment.story_attachment.media && response.extensible_attachment.story_attachment.media.image ? response.extensible_attachment.story_attachment.media.image.height : '',
                                        playable: response.extensible_attachment.story_attachment.media && response.extensible_attachment.story_attachment.media.is_playable ? response.extensible_attachment.story_attachment.media.is_playable : false,
                                        duration: response.extensible_attachment.story_attachment.media && response.extensible_attachment.story_attachment.media.playable_duration_in_ms ? response.extensible_attachment.story_attachment.media.playable_duration_in_ms : 0,

                                        subattachments: response.extensible_attachment.subattachments,
                                        properties: response.extensible_attachment.story_attachment.properties
                                    }],
                                    mentions: {},
                                    timestamp: parseInt(response.timestamp_precise),
                                    isGroup: (response.message_sender.id != tid.toString())
                                });
                            }
                        }
                    }
                }
                break;
            }
            case 'ApprovalQueue':
            case 'ThreadName':
            case 'ParticipantsAddedToGroupThread':
            case 'ParticipantLeftGroupThread': {
                if (globalOptions.listenEvents) {
                    try {
                        var formatEvent = formatDeltaEvent(deltas);
                        callback(null, formatEvent);
                    } catch (error) {
                        callback(error, null);
                    }
                }
                break;
            }
        }
    }

    return function listen(callback) {
        try {
            var sessionID = Math.floor(Math.random() * 9007199254740991) + 1;
            var cookies = jar.getCookies('https://www.facebook.com').join('; ');
            var host = Cli.MQTT ? Cli.MQTT + '&sid=' + sessionID : Cli.region ? `wss://edge-chat.facebook.com/chat?region=${Cli.region.toLocaleLowerCase()}&sid=${sessionID}` : `wss://edge-chat.facebook.com/chat?sid=${sessionID}`;
            var topics = [
                "/t_ms",
                "/thread_typing",
                "/orca_typing_notifications",
                "/orca_presence",
                "/legacy_web",
                "/br_sr",
                "/sr_res",
                "/webrtc",
                "/onevc",
                "/notify_disconnect",
                "/inbox",
                "/mercury",
                "/messaging_events",
                "/orca_message_notifications",
                "/pp",
                "/webrtc_response",
                "/legacy_web_mtouch",
                "/set_client_settings",
                "/messenger_sync_create_queue"
            ];
            var userInformations = {
                u: Cli.userID,
                s: sessionID,
                chat_on: globalOptions.online,
                fg: false,
                d: getGUID(),
                ct: "websocket",
                aid: Cli.appID,
                mqtt_sid: "",
                cp: 3,
                ecp: 10,
                st: [],
                pm: [],
                dc: "",
                no_auto_fg: true,
                gas: null,
                pack: []
            };
            var options = {
                clientId: "mqttwsclient",
                protocolId: 'MQIsdp',
                protocolVersion: 3,
                username: JSON.stringify(userInformations),
                clean: true,
                wsOptions: {
                    headers: {
                        'Cookie': cookies,
                        'Origin': 'https://www.facebook.com',
                        'User-Agent': globalOptions.userAgent,
                        'Referer': 'https://www.facebook.com/',
                        'Host': new URL(host).hostname
                    },
                    origin: 'https://www.facebook.com',
                    protocolVersion: 13
                },
                keepalive: 10,
                reschedulePings: false
            };

            Cli.mqttClient = new mqtt.Client(_ => ws(host, options.wsOptions), options);
            var mqttClient = Cli.mqttClient;

            mqttClient.on('error', function (error) {
                if (globalOptions.autoReconnect) getSeqID(function() {
                    log('LISTENER', 'Got an error. AutoReconnect is enable, starting reconnect...', 'warn');
                    return listen(callback);
                });
                callback(error, null);
            });

            mqttClient.on('connect', function () {
                topics.forEach(topic => mqttClient.subscribe(topic));
                var queue = {
                    sync_api_version: 10,
                    max_deltas_able_to_process: 1000,
                    delta_batch_size: 500,
                    encoding: "JSON",
                    entity_fbid: Cli.userID,
                    initial_titan_sequence_id: Cli.irisSeqID,
                    device_params: null
                };

                mqttClient.publish('/messenger_sync_create_queue', JSON.stringify(queue), { qos: 1, retain: false });
                mqttClient.publish("/foreground_state", JSON.stringify({ foreground: globalOptions.onlineStatus }), { qos: 1 });
                mqttClient.publish("/set_client_settings", JSON.stringify({ make_user_available_when_in_foreground: true }), { qos: 1 });

                var rTimeout = setTimeout(function () {
                    mqttClient.end();
                    getSeqID();
                }, 5000);

                Cli.tmsWait = function () {
                    clearTimeout(rTimeout);
                    if (globalOptions.emitReady) log('LISTENER', 'Listener is enable.', 'warn');
                    delete Cli.tmsWait;
                    api.stopListener = function() {
                        mqttClient.unsubscribe("/webrtc");
                        mqttClient.unsubscribe("/rtc_multi");
                        mqttClient.unsubscribe("/onevc");
                        mqttClient.publish("/browser_close", "{}");
                        mqttClient.end();
                        delete api.mqttClient;
                        delete api.stopListener;
                    }
                };
            });

            mqttClient.on('message', function (topic, message, _packet) {
                let jsonMessage = Buffer.isBuffer(message) ? Buffer.from(message).toString() : message;
                try {
                    jsonMessage = JSON.parse(jsonMessage);
                    if (jsonMessage.type == "jewel_requests_add") {
                        callback(null, {
                            type: 'friend_request_received',
                            actor_FbId: jsonMessage.from.toString(),
                            timestamp: Date.now()
                        })
                    }
                    if (jsonMessage.type === "jewel_requests_remove_old") {
                        callback(null, {
                            type: "friend_request_cancel",
                            actorFbId: jsonMessage.from.toString(),
                            timestamp: Date.now()
                        })
                    }
                    if (topic == "/t_ms") {
                        if (Cli.tmsWait && Function.isFunction(Cli.tmsWait)) Cli.tmsWait();
                        for (var i in jsonMessage.deltas) parseDelta(callback, jsonMessage.deltas[i]);
                    }
                    if (['/thread_typing', '/orca_typing_notifications'].includes(topic) && globalOptions.listenTyping) {
                        var typ = {
                            type: "typ",
                            isTyping: !!jsonMessage.state,
                            from: jsonMessage.sender_fbid.toString(),
                            threadID: formatID((jsonMessage.thread || jsonMessage.sender_fbid).toString())
                        };
                        callback(null, typ);
                    }
                    if (topic === "/orca_presence" && globalOptions.updatePresence) {
                        for (let i of jsonMessage.list) {
                            callback(null, {
                                type: 'presence',
                                userID: i['u'].toString(),
                                timestamp: i['l'] * 1000,
                                statuses: i['p']
                            });
                        }
                    }
                } catch (error) {
                    callback(error, null);
                }
            });

            mqttClient.on('close', function () {
                mqttClient.removeAllListeners();
                if (globalOptions.emitReady) log('LISTENER', 'Listener is close.', 'warn');
                if (globalOptions.autoReconnect) getSeqID(function() {
                    log('LISTENER', 'AutoReconnect is enable, starting reconnect...', 'warn');
                    return listen(callback);
                });
            });
        } catch (error) {
            return callback(error, null);
        }
    }
}