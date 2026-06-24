import express from "express";
import Agent from "../models/agent.model.js";
import Claim from "../models/claim.model.js";
import { sendClaimUpdateEmail } from "../lib/email.js";
const router = express.Router();


// Create a new claim
router.post('/', async (req, res) => {
    try {
        const { clientName, claimType } = req.body;

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

        // Fetch clientSummary from another endpoint (assuming it's already available)
        const clientSummary = "Please Initiate a call to generate client summary"; // Replace with actual fetch logic

        // Create new claim
        const newClaim = new Claim({ claimID, clientName, claimType, priority, clientSummary });
        await newClaim.save();

        // Return the claimID to the frontend
        res.status(201).send({ claimID });
    } catch (error) {
        console.error("Error creating claim:", error);
        res.status(500).send({ message: error.message || "Failed to create claim" });
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
        res.status(500).send('Error searching for claim');
    }
});

export default router;