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
        default: 'test@example.com'
    },
    last_notified_at: {
        type: Date,
        default: null
    }
});

const Claim = mongoose.model("Claim", ClaimSchema);
export default Claim;