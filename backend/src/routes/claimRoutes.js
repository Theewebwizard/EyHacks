import express from "express";
import Agent from "../models/agent.model.js";
import Claim from "../models/claim.model.js";
import { sendClaimUpdateEmail } from "../lib/email.js";
import { protectClientRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Get all claims for the logged in client
router.get('/my-claims', protectClientRoute, async (req, res) => {
    try {
        const claims = await Claim.find({ 
            clientEmail: new RegExp('^' + req.client.email + '$', 'i') 
        }).sort({ createdAt: -1 });

        res.status(200).json(claims);
    } catch (error) {
        console.error("Error fetching client claims:", error);
        res.status(500).json({ error: "Failed to fetch claims." });
    }
});


// Create a new claim
router.post('/', async (req, res) => {
    try {
        const { clientName, claimType, clientEmail } = req.body;
        
        if (!clientEmail) {
             return res.status(400).json({ error: "clientEmail is required to create a claim." });
        }

        // Dynamically find a unique claimID
        let claimID;
        let isUnique = false;
        
        // Find the latest claim to get the next seed
        const latestClaim = await Claim.findOne().sort({ _id: -1 });
        let currentSeed = 1000;
        if (latestClaim && latestClaim.claimID) {
            const match = latestClaim.claimID.match(/CLM-(\d+)/);
            if (match) {
                currentSeed = parseInt(match[1], 10) + 1;
            }
        }

        while (!isUnique) {
            claimID = `CLM-${currentSeed}`;
            const existingClaim = await Claim.findOne({ claimID });
            if (!existingClaim) {
                isUnique = true;
            } else {
                currentSeed++;
            }
        }

        // Assign priority based on claimType
        let priority;
        switch (claimType) {
            case 'medical':
                priority = 5;
                break;
            case 'financial':
                priority = 4;
                break;
            default:
                priority = 1; // Default priority for other claim types
        }

        // Initialize an empty clientSummary
        const clientSummary = "";

        // Create new claim
        const newClaim = new Claim({ claimID, clientName, claimType, priority, clientSummary, clientEmail });
        await newClaim.save();

        // Return the claimID to the frontend
        res.status(201).send({ claimID });
    } catch (error) {
        console.error("Error creating claim:", error);
        res.status(500).send({ error: "Failed to create claim." });
    }
});

// Secure Client Login (2-Factor Verification)
router.post('/client-login', async (req, res) => {
    try {
        const { claimID, clientEmail } = req.body;
        
        if (!claimID || !clientEmail) {
            return res.status(400).json({ message: "Both Claim ID and Registered Email are required." });
        }

        // Must match BOTH strictly (case-insensitive for email, strict for claimID)
        const claim = await Claim.findOne({ 
            claimID: claimID.toUpperCase(), 
            clientEmail: new RegExp('^' + clientEmail + '$', 'i')
        });

        if (!claim) {
            return res.status(401).json({ message: "Access Denied: Invalid Claim ID or Email." });
        }

        res.status(200).json(claim);
    } catch (error) {
        console.error("Client Login Error:", error);
        res.status(500).json({ message: "Server error during login." });
    }
});

// Assign claims to agents
router.post('/assign', async (req, res) => {
    // Only assign claims that are Verified, or Rejected (needs manual review)
    // Exclude 'Awaiting Documents' and 'Pending Review' from auto-assignment to save agent capacity
    const claims = await Claim.find({ 
        agentID: null, 
        validation_status: { $in: ['Verified', 'Rejected'] } 
    }).sort({ priority: -1 }); // Sort by priority descending
    
    const agents = await Agent.find({});

    for (let claim of claims) {
        // If Rejected, escalate to senior agents (assuming those with higher capacity or just a specific queue, we'll assign to any available for now but mark it as high priority)
        if (claim.validation_status === 'Rejected') {
            claim.priority = 5; // Escalate priority
        }

        const agent = agents.find(a => {
            if (claim.priority >= 3) {
                return a.numOFhighpriorityclaims < 10;
            } else {
                return a.numOFlowpriorityclaims < 15;
            }
        });

        if (agent) {
            claim.agentID = agent.agentID;
            claim.status = "Assigned to Agent";
            claim.last_notified_at = new Date();
            
            if (claim.priority >= 3) {
                agent.numOFhighpriorityclaims += 1;
            } else {
                agent.numOFlowpriorityclaims += 1;
            }
            await claim.save();
            await agent.save();

            // Send Email Notification
            await sendClaimUpdateEmail(
                claim.clientEmail,
                claim.clientName,
                claim.claimID,
                `Your claim has been assigned to an agent for review. Our team is working on it and will reach out shortly.`
            );
        }
    }

    res.send('Claims assigned');
});

// Get claims for an agent
router.get('/agent/:agentID', async (req, res) => {
    const claims = await Claim.find({ agentID: req.params.agentID });
    res.send(claims);
});

//search claim by claim ID
router.get('/search/:claimID', async (req, res) => {
    try {
        const claim = await Claim.findOne({ claimID: req.params.claimID });
        if (claim) {
            res.status(200).send(claim);
        } else {
            res.status(404).send('Claim not found');
        }
    } catch (error) {
        console.error("Error searching for claim:", error);
        res.status(500).json({ error: 'Error searching for claim', details: error.message });
    }
});

// Resolve claim by claim ID
router.put('/resolve/:claimID', async (req, res) => {
    try {
        const { status } = req.body; // e.g. "Resolved" or "Disapproved"
        const claim = await Claim.findOne({ claimID: req.params.claimID });
        if (claim) {
            claim.status = status || "Resolved";
            await claim.save();
            res.status(200).send(claim);
        } else {
            res.status(404).send('Claim not found');
        }
    } catch (error) {
        console.error("Error resolving claim:", error);
        res.status(500).json({ error: 'Error resolving claim', details: error.message });
    }
});

// Submit detailed feedback for a claim
router.put('/feedback/:claimID', async (req, res) => {
    try {
        const { rating, comments } = req.body;
        const claim = await Claim.findOne({ claimID: req.params.claimID });
        if (claim) {
            claim.feedback = { rating: Number(rating), comments, submittedAt: new Date() };
            await claim.save();
            res.status(200).send(claim);
        } else {
            res.status(404).send('Claim not found');
        }
    } catch (error) {
        console.error("Error saving feedback:", error);
        res.status(500).json({ error: 'Error submitting feedback', details: error.message });
    }
});

export default router;