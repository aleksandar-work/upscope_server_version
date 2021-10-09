const mongoose = require( 'mongoose' );

/**
 * sessionSchema - store Upscope session-related data 
 */
const sessionSchema = new mongoose.Schema(
    {
        // Upscope ShortID that this session belongs to  TODO: make this a ref to a unique "Visitor / ShortID"
        shortId: {
            type: String
        },

        domain: {
            type: String
        },

        length_seconds: {
            type: Number
        },

        formatted_length: {
            type: String
        },

        call_length_seconds: {
            type: Number
        },

        formatted_call_length: {
            type: String
        },

        started_at: {
            type: Date
        },

        ended_at: {
            type: Date
        },

        went_live: {
            type: Boolean
        },

        features_used: {
            type: [String]
        }
    },
    {
        timestamps: true
    }
);

mongoose.model('Session', sessionSchema);

module.exports = sessionSchema;