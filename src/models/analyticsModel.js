const mongoose = require( 'mongoose' );

/**
 * analyticsSchema - store aggregated analytics data per domain 
 * model: 
 * domain - unique dealer (represented by domain) for which this set of analytics is aggregated for
 * 
 */
const analyticsSchema = new mongoose.Schema(

    {
        // Domain - unique dealer (represented by domain) for which this set of analytics is aggregated for
        domain: {
            type: String,
            unique: true
        },

        // First Seen (array of Dates across all visitors for this domain) - "added_at"
        first_seen: [Date],

        // Last Seen
        last_seen: [Date],

        // Device Names 
        device_names: [String],
        
        // Device Types
        device_types: [String],

        // # of Visitors currently in session
        is_in_session: Number,

        // # of Visitors currently online
        is_online: Number,

        // # of Visitors supported by an agent
        is_supported: Number,

        // Cities (array of City names)
        cities: [String],

        // Country ID's (array of Country ID's)
        countries: [String],

        // Country Names (array of Country Names)
        country_names: [String],

        /** Below are more API-intensive (session-based) analytics that are polled at a longer time interval */
        
        // Total # of Sessions across all visitors
        total_num_sessions: Number,

        // Aggregate Session length (in seconds) across all visitors 
        total_session_length: Number,

        // Aggregate Call length (in seconds) across all visitors
        total_call_length: Number,

    },
    {
        timestamps: true
    }
);

mongoose.model('Analytics', analyticsSchema);

module.exports = analyticsSchema;