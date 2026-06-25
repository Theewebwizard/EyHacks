import mongoose from "mongoose";

const ClaimSchema = mongoose.Schema({
    claimID: {
        type: String,
        required: true,
        unique: true
    },
    agentID: {
        type: String,
        default: null
    },
    clientSummary: {
        type: String,
        required: true
    },
    clientName: {
        type: String,
        required: true
    },
    claimType: {
        type: String,
        required: true
    },
    priority: {
        type: Number,
        required: true
    },
    documents: [{ type: String }], // Array of file paths or URLs
    documentAnalysis: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        default: 'Pending Agent Assignment'
    },
    validation_status: {
        type: String,
        default: 'Awaiting Documents'
    },
    clientEmail: {
        type: String,
        required: true
    },
    last_notified_at: {
        type: Date,
        default: null
    },
    feedback: {
        rating: { type: Number, default: 0 },
        comments: { type: String, default: "" },
        submittedAt: { type: Date, default: null }
    }
});

const Claim = mongoose.model("Claim", ClaimSchema);
export default Claim;