const express = require('express');
const mongoose = require('mongoose');

const analyticsSchema = require("../models/analyticsModel");
const Analytics = mongoose.model('Analytics', analyticsSchema);
const Conversation = mongoose.model('Conversation');
const sessionSchema = require("../models/sessionModel");
const Session = mongoose.model('Session', sessionSchema);

const router = express.Router();
const { upscopeServer } = require('../shared/server');
const { refreshSessionMetrics } = require('../shared/analytics');

const authVerify = require('../middleware/authVerify');
const { json } = require('express');

/**
 * Get All Sessions for a Domain 
 */
router.get('/biz/analytics/sessions', authVerify, async (req, res) => {

    try {

        const domain = req.query.domain;
        if (!domain) return res.status.json({ error: "No domain specified" });

        const shortId = req.query.shortId; // optional parameter 

        const matchingSessions = (!shortId) ? await Session.find({ domain: domain }) : await Session.find({ domain: domain, shortId: shortId });

        if (matchingSessions) {
            return res.status(200).json(matchingSessions);
        } else {
            return res.status(404);
        }
        
    } catch (err) {
        return res.status(500).json({ error: err });
    }
});

/**
 * Get all session analytics, for table view on Dashboard 
 */
router.get('/biz/analytics/summary', authVerify, async (req, res) => {
    try {
        const domain = req.query.domain;
        if (!domain) return res.status.json({ error: "No domain specified" });

        // Query Upscope /list search endpoint by parameter domain 
        const UPSCOPE_LIST_ENDPOINT = `/v1.1/list.json?max_results=10000`;

        upscopeServer.get(UPSCOPE_LIST_ENDPOINT).then(async (upscopeResult) => {

            const parse = upscopeResult.data.visitors.filter(visitor => {
                return (visitor.last_url && visitor.last_url.includes(domain));
            });

            let analyticsData = {

                // first_seen - map over "added_at" dates
                first_seen: parse.map(v => v.added_at),

                // last_seen - map over "last_seen" dates
                last_seen: parse.map(v => v.last_seen_at),

                // device names - map over "device_name" strings
                device_names: parse.map(v => v.device_name),

                // device types - map over "device_type" strings
                device_types: parse.map(v => v.device_type),

                // is in session - reduce over "is_in_session" booleans to get total # of is_in_session=true
                is_in_session: parse.reduce((prev, next) => next.is_in_session ? ++prev : prev, 0),

                // is online - reduce over "is_online" booleans to get total # of is_online=true
                is_online: parse.reduce((prev, next) => next.is_online ? ++prev : prev, 0),

                // is supported - reduce over "is_supported" booleans to get total # of is_supported=true
                is_supported: parse.reduce((prev, next) => next.is_supported ? ++prev : prev, 0),

                // cities - map over "location_city"
                cities: parse.map(v => v.location_city),

                // country ID's - map over "location_country"
                countries: parse.map(v => v.location_country),

                // country names - map over "location_country_name"
                country_names: parse.map(v => v.location_country_name),

            };

            // Save this first part to the DB
            const analyticsQuery = { domain: domain };
            const analyticsOptions = { upsert: true, useFindAndModify: false };

            Analytics.findOneAndUpdate(analyticsQuery, analyticsData, analyticsOptions, (err, res) => {
                if (!err) {
                    if (!res) {
                        res = new Analytics();
                    }
                    res.save();
                }
            });

            // Fill in the second part (per-visitor breakdown metrics) by joining conversation data to existing analytics data on shortId 
            let shortIds = parse.map(v => v.short_id);

            let matchingConversations = await Conversation.find({ 'shortId': { $in: shortIds } });

            let shortIdMap = new Map();

            matchingConversations.map(convo => {
                const referrer = (convo && convo.urls && convo.urls.length && convo.urls.length > 0) ? convo.urls[0].url : "";
                const urls = convo.urls;
                const name = convo.name;
                const owner = convo.owner;
                shortIdMap.set(convo.shortId, { referrer, urls, name, owner });
            });  // create map with shortId as key

            for (let v of parse) {
                let existingData = shortIdMap.get(v.short_id);
                let matchingSessions = await Session.find({ shortId: v.short_id });

                shortIdMap.set(v.short_id, {
                    ...existingData,
                    'first_seen': v.added_at,
                    'last_seen': v.last_seen_at,
                    'device_name': v.device_name,
                    'device_type': v.device_type,
                    'is_in_session': v.is_in_session,
                    'is_online': v.is_online,
                    'is_supported': v.is_supported,
                    'city': v.location_city,
                    'country': v.location_country,
                    'country_name': v.location_country_name,
                    'sessions': matchingSessions
                });
            }

            function strMapToObj(strMap) {
                let obj = Object.create(null);
                for (let [k, v] of strMap) {
                    obj[k] = v;
                }
                return obj;
            }

            let shortIdMapAsObj = strMapToObj(shortIdMap);
            return res.status(200).json({
                ...analyticsData,
                visitor_breakdown: shortIdMapAsObj
            });
        });

    } catch (err) {
        return res.status(500).json({ error: err });
    }
});


/**
 * Get aggregate Engaged / Ignored / Un-answered counts, for a date range
 */
router.get('/biz/analytics/conversation-stats', authVerify, async (req, res) => {

    try {

        // Query Parameters
        const dateTimeStart = req.query.date_time_start;
        const dateTimeEnd = req.query.date_time_end;
        const domain = req.query.domain; 

        if (!dateTimeStart || !dateTimeEnd || !domain) return res.status(400).json({ error: "Missing query parameters" });

        // Validation check on date range
        if (new Date(dateTimeStart) > new Date(dateTimeEnd)) return res.status(400).json({ error: "Start Time is before End Time" });

        // Construct base query, by domain and date range 
        const baseQuery = { domain: domain, createdAt: { $gte: dateTimeStart, $lte: dateTimeEnd }};

        // Retrieve total num of conversations based on base query
        const conversationsForDomain = await Conversation.find(baseQuery);

        // Find all engaged conversations with extension of base query where owner is not null 
        const engaged = await Conversation.find({ ...baseQuery, owner: { $ne: null }});

        // Find all ignored conversations with extension of base query where owner is null, and no messages exist in that conversation
        const ignored = await Conversation.find({ ...baseQuery, owner: null, messages: [] });

        // Find all unanswered conversations with extension of base query where owner is null, and messages do exist in that conversation (from chat user) 
        const unanswered = await Conversation.find({ ...baseQuery, owner: null, messages: { $exists: true, $type: 'array', $ne: [] }})

        return res.status(200).json({
            total: conversationsForDomain.length,
            engaged: engaged.length,
            ignored: ignored.length,
            unanswered: unanswered.length
        });
        
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err });
    }
})



module.exports = router;