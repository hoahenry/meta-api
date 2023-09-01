const mqtt = require('mqtt');
const ws = require('websocket-stream');

module.exports = function ({ request, browser, utils, client, api, log }) {
    function getForm(docID, queryParams) {
        return {
            av: client.configs?.pageID,
            queries: JSON.stringify({
                o0: {
                    doc_id: docID,
                    query_params: queryParams
                }
            })
        }
    }
    async function getSeqID(callback) {
        try {
            if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
            var response = await browser.post('https://www.facebook.com/api/graphqlbatch/', getForm('3336396659757871', {
                "limit": 1,
                "before": null,
                "tags": ["INBOX"],
                "includeDeliveryReceipts": false,
                "includeSeqID": true
            }));
            if (!Array.isArray(response)) throw new Error('Not logged in.');
            client.irisSeqID = response[0].o0.data.viewer.message_threads.sync_sequence_id;
            return callback();
        } catch (error) {
            return callback(error);
        }
    }

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
                    var formatMessage = utils.formatDeltaMessage(deltas);
                    if (client.configs.autoMarkRead && formatMessage.senderID !== client.userID) api.markRead(formatMessage.threadID);
                    if (client.configs.selfListen || !client.configs.selfListen && formatMessage.senderID !== client.userID) return callback(null, formatMessage);
                } catch (error) {
                    return callback(error, null);
                }
                break;
            }
            case 'ClientPayload': {
                var clientPayload = utils.decodeClientPayload(deltas.payload);
                if (clientPayload && clientPayload.deltas) {
                    for (var i in clientPayload.deltas) {
                        var delta = clientPayload.deltas[i];
                        if (delta.deltaMessageReaction && !!client.configs.listenEvents) {
                            callback(null, {
                                type: "message_reaction",
                                threadID: delta.deltaMessageReaction.threadKey.threadFbId ? delta.deltaMessageReaction.threadKey.threadFbId.toString() : delta.deltaMessageReaction.threadKey.otherUserFbId.toString(),
                                messageID: delta.deltaMessageReaction.messageId,
                                reaction: delta.deltaMessageReaction.reaction,
                                senderID: delta.deltaMessageReaction.senderId == 0 ? delta.deltaMessageReaction.userId.toString() : delta.deltaMessageReaction.senderId.toString(),
                                userID: delta.deltaMessageReaction.userId.toString() || delta.deltaMessageReaction.senderId.toString()
                            })
                        }
                        if (delta.deltaRecallMessageData && !!client.configs.listenEvents) {
                            callback(null, {
                                type: "message_unsend",
                                threadID: delta.deltaRecallMessageData.threadKey.threadFbId ? delta.deltaRecallMessageData.threadKey.threadFbId.toString() : delta.deltaRecallMessageData.threadKey.otherUserFbId.toString(),
                                messageID: delta.deltaRecallMessageData.messageID,
                                senderID: delta.deltaRecallMessageData.senderID.toString(),
                                deletionTimestamp: delta.deltaRecallMessageData.deletionTimestamp,
                                timestamp: delta.deltaRecallMessageData.messageTimestamp
                            })
                        }
                        if (delta.deltaMessageReply) {
                            var mdata = delta.deltaMessageReply.message === undefined ? [] : delta.deltaMessageReply.message.data === undefined ? [] : delta.deltaMessageReply.message.data.prng === undefined ? [] : JSON.parse(delta.deltaMessageReply.message.data.prng);
                            var m_id = mdata.map(u => u.i);
                            var m_offset = mdata.map(u => u.o);
                            var m_length = mdata.map(u => u.l);

                            var mentions = {};

                            for (var i = 0; i < m_id.length; i++) mentions[m_id[i]] = (delta.deltaMessageReply.message.body || "").substring(m_offset[i], m_offset[i] + m_length[i]);

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
                                        x = utils._formatAttachment(att);
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
                                for (var i = 0; i < m_id.length; i++) rmentions[m_id[i]] = (delta.deltaMessageReply.repliedToMessage.body || "").substring(m_offset[i], m_offset[i] + m_length[i]);
                                
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
                                            x = utils._formatAttachment(att);
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
                                var response = await browser.post('https://www.facebook.com/api/graphqlbatch/', getForm('2848441488556444', {
                                    "thread_and_message_id": {
                                        "thread_id": callbackToReturn.threadID,
                                        "message_id": delta.deltaMessageReply.replyToMessageId.id
                                    }
                                }));
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
                                            x = utils._formatAttachment({
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
                            if (client.configs.autoMarkRead) api.markRead(callbackToReturn.threadID);
                            if (client.configs.selfListen || !client.configs.selfListen && callbackToReturn.senderID !== Cli.userID) callback(null, callbackToReturn);
                        }
                    }
                    break;
                }
            }
            case 'ReadReceipt': {
                if (client.configs.readReceipt) {
                    try {
                        var formatMessage = utils.formatDeltaReadReceipt(deltas);
                        callback(null, formatMessage);
                    } catch (error) {
                        callback(error, null);
                    }
                }
                break;
            }
            case 'AdminTextMessage': {
                var type = ['change_thread_theme', 'change_thread_nickname', 'change_thread_icon', 'change_thread_admins', 'group_poll'];
                if (type.includes(deltas.type) && client.configs.listenEvents) {
                    try {
                        var formatMessage = utils.formatDeltaEvent(deltas);
                        callback(null, formatMessage);
                    } catch (error) {
                        callback(error, null)
                    }
                }
                break;
            }
            case 'ForcedFetch': {
                if (deltas.threadKey && client.configs.listenEvents) { 
                    var mid = deltas.messageId;
                    var tid = (deltas.threadKey.threadFbId || deltas.threadKey.otherUserFbId).toString();
                    if (mid && tid) {
                        let form = getForm('2848441488556444', {
                            "thread_and_message_id": {
                                "thread_id": tid,
                                "message_id": mid
                            }
                        });
                        var response = await browser.post('https://www.facebook.com/api/graphqlbatch/', form);
                        if (response[response.length - 1].error_results > 0 || response[response.length - 1].successful_results === 0) return callback(response, null);
                        if (Object.isObject(response)) {
                            if (response.__typename == 'ThreadImageMessage') {
                                if (client.configs.selfListenEvents && response.message_sender.id == Cli.userID) {
                                    callback(null, {
                                        type: "event",
                                        threadID: utils.formatID(tid.toString()),
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
                                    senderID: utils.formatID(response.message_sender.id),
                                    body: response.message.text || "",
                                    threadID: utils.formatID(tid.toString()),
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
                if (client.configs.listenEvents) {
                    try {
                        var formatEvent = utils.formatDeltaEvent(deltas);
                        callback(null, formatEvent);
                    } catch (error) {
                        callback(error, null);
                    }
                }
                break;
            }
        }
    }

    return async function listen(callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        var sessionID = Math.floor(Math.random() * 9007199254740991) + 1;
        var cookies = request.jar.getCookies('https://www.facebook.com').concat(request.jar.getCookies('https://www.messenger.com')).join('; ');
        var host = client.wssEndPoint ? client.wssEndPoint + '&sid=' + sessionID : client.region ? `wss://edge-chat.facebook.com/chat?region=${client.region.toLocaleLowerCase()}&sid=${sessionID}` : `wss://edge-chat.facebook.com/chat?sid=${sessionID}`;
        var options = {
            clientId: "mqttwsclient",
            protocolId: 'MQIsdp',
            protocolVersion: 3,
            username: JSON.stringify({
                u: client.userID,
                s: sessionID,
                chat_on: client.configs.onlineStatus,
                fg: false,
                d: utils.getGUID(),
                ct: "websocket",
                aid: client.appID,
                mqtt_sid: "",
                cp: 3,
                ecp: 10,
                st: [],
                pm: [],
                dc: "",
                no_auto_fg: true,
                gas: null,
                pack: []
            }),
            clean: true,
            wsOptions: {
                headers: {
                    'Cookie': cookies,
                    'Origin': 'https://www.facebook.com',
                    'User-Agent': client.configs.userAgent,
                    'Referer': 'https://www.facebook.com/',
                    'Host': new URL(host).hostname
                },
                origin: 'https://www.facebook.com',
                protocolVersion: 13
            },
            keepalive: 10,
            reschedulePings: false
        };

        if (!client.irisSeqID) await getSeqID();

        client.mqtt = new mqtt.Client(_ => ws(host, options.wsOptions), options);
        
        client.mqtt.on('error', function (error) {
            client.mqtt.removeAllListeners();
            if (client.configs.autoReconnect) {
                log('LISTENER', 'Got an error. AutoReconnect is enable, starting reconnect...', 'warn');
                return getSeqID(function(error) {
                    return error ? callback(error) : listen(callback);
                });
            }
            return callback(error, null);
        });

        client.mqtt.on('connect', function () {
            client.mqtt.subscribe('#');
            var queue = {
                sync_api_version: 10,
                max_deltas_able_to_process: 1000,
                delta_batch_size: 500,
                encoding: "JSON",
                entity_fbid: client.userID
            };

            if (client.syncToken) {
                queue.last_seq_id = client.irisSeqID;
                queue.sync_token = client.syncToken;
                client.mqtt.publish('/messenger_sync_get_diffs', JSON.stringify(queue), { qos: 1 });
            } else {
                queue.initial_titan_sequence_id = client.irisSeqID;
                queue.device_params = null;
                client.mqtt.publish('/messenger_sync_create_queue', JSON.stringify(queue), { qos: 1 });
            }

            client.mqtt.publish("/foreground_state", JSON.stringify({ foreground: client.configs.onlineStatus }), { qos: 1 });
            client.mqtt.publish("/set_client_settings", JSON.stringify({ make_user_available_when_in_foreground: true }), { qos: 1 });

            var reconnectTimeout = setTimeout(function() {
                client.mqtt.end();
                return getSeqID(function(error) {
                    return error ? callback(error) : listen(callback);
                });
            }, 5000);

            client.tmsWait = function() {
                clearTimeout(reconnectTimeout);
                if (client.configs.emitReady) log('LISTENER', 'Listener is connected.', 'warn');
                delete client.tmsWait;
                api.disconnect = function() {
                    client.mqtt.unsubscribe("/webrtc");
                    client.mqtt.unsubscribe("/rtc_multi");
                    client.mqtt.unsubscribe("/onevc");
                    client.mqtt.publish("/browser_close", "{}");
                    client.mqtt.end();
                    delete client.mqtt;
                    delete api.disconnect;
                    return log('LISTENER', 'Listener is disconnected.');
                }
            }
        });

        client.mqtt.on('message', async function(topic, message, _packet) {
            let data = await utils.buffer2json(message);
            
            if (data.type === 'jewel_requests_add') {
                return callback(null, {
                    type: "friend_request_received",
                    actorFbId: data.from.toString(),
                    timestamp: Date.now().toString()
                })
            }
            if (data.type === 'jewel_requests_remove_old') {
                return callback(null, {
                    type: "friend_request_cancel",
                    actorFbId: data.from.toString(),
                    timestamp: Date.now().toString()
                })
            }
            if (topic === '/t_ms') {
                if (data.firstDeltaSeqId) client.irisSeqID = data.firstDeltaSeqId;
                if (data.syncToken) client.syncToken = data.syncToken;
                if (client.tmsWait && Function.isFunction(client.tmsWait)) client.tmsWait();
                for (let i in data.deltas) parseDelta(callback, data.deltas[i]);
            }
            if ((topic === '/thread_typing' || topic === '/orca_typing_notifications') && client.configs.listenTyping) return callback(null, {
                type: "typ",
                isTyping: !!data.state,
                from: data.sender_fbid.toString(),
                threadID: utils.formatID((data.thread || data.sender_fbid).toString())
            });
            if (topic === '/orca_presence' && client.configs.updatePresence) {
                let list = [];
                for (let i of data.list) {
                    list.push({
                        type: 'presence',
                        userID: i['u'].toString(),
                        timestamp: i['u'] * 1000,
                        statuses: i['p']
                    })
                }
            }
        });

        client.mqtt.on('close', function () {
            client.mqtt.removeAllListeners();
            if (client.configs.emitReady) log('LISTENER', 'Listener is disconnected.', 'warn');
            if (client.configs.autoReconnect) {
                log('LISTENER', 'Starting reconnect...', 'warn');
                return getSeqID(function(error) {
                    return error ? callback(error) : listen(callback);
                });
            }
        });
    }
}