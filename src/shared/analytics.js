const cron = require('node-cron');
const mongoose = require('mongoose');

const Analytics = mongoose.model('Analytics');
const Conversation = mongoose.model('Conversation');

const sessionSchema = require("../models/sessionModel");
const Session = mongoose.model('Session', sessionSchema);

const { upscopeServer } = require('../shared/server');

/**
 * Create a CRON job that runs daily
 */
cron.schedule('0 * * * *', () => {

    // Refresh Session Metrics
    refreshSessionMetrics().then(() => {
        console.log("Updated Session Metrics");
    })
});

function delay() {
    const delayAmountMs = 500;
    return new Promise(ok => setTimeout(ok, delayAmountMs));
}

/**
 * Pull Per-Session Metrics for all conversations, aggregate per domain, then sync to DB
 */
const refreshSessionMetrics = async () => {

    try {

        // Find all Visitors (shortId's) by querying Conversations
        let convos = await Conversation.find();

        // Clean up conversations - all convos to aggregate must have a valid shortId and domain 
        let filteredConvos = convos.filter(c => (c.domain && c.shortId));

        // Organize conversations a bit by inserting them into a map indexed by domain
        let convoMap = new Map();
        filteredConvos.forEach(fc => {
            if (fc.shortId && fc.shortId !== "null" && fc.shortId.length === 17) { // filter for valid upscope shortIds
                if (convoMap.get(fc.domain) !== undefined) {
                    let currentData = convoMap.get(fc.domain);
                    currentData.push(fc.shortId);
                    convoMap.set(fc.domain, currentData);
                } else {
                    let data = [];
                    data.push(fc.shortId);
                    convoMap.set(fc.domain, data);
                }
            }
        });

        let requestPool = [];
        for (let convoDomain of convoMap.keys()) {

            let shortIds = convoMap.get(convoDomain);
            if (shortIds && shortIds.length > 0) {

                shortIds.forEach((shortId) => {

                    let apiURL = `/v1.1/visitors/${shortId}.json`;
                    requestPool.push([apiURL, convoDomain]);

                });
            }
        }

        for ([requestUrl, requestDomain] of requestPool) {

            await delay();
    
            const response = await upscopeServer.get(requestUrl);
            if (response && response.data) {
                
                const sessionData = response.data.visitor.sessions;
                if (sessionData && sessionData.length && sessionData.length > 0) {

                    for (let _s of sessionData) {

                        // individual session, first look for matching session
                        const matchingSession = await Session.findOne({ shortId: _s.visitor_id });

                        if (!matchingSession) {

                            // Create new session object
                            const sessionToAdd = new Session({
                                shortId: _s.visitor_id,
                                domain: requestDomain,
                                length_seconds: _s.length_seconds,
                                formatted_length: _s.formatted_length,
                                call_length_seconds: _s.call_length_seconds,
                                formatted_call_length: _s.formatted_call_length,
                                started_at: _s.started_at,
                                ended_at: _s.ended_at,
                                went_live: _s.went_live,
                                features_used: _s.featuresUsed
                            });
                            await sessionToAdd.save();
                        }

                    }
                }
            }
        }

    } catch(err) {
        console.error(err);
    } finally {
        return;
    }
}


module.exports = { refreshSessionMetrics };