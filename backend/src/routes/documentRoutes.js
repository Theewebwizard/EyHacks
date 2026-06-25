import express from "express";
import Claim from "../models/claim.model.js";
import path from "path";
import fs from "fs";
import { getChannel } from "../lib/rabbitmq.js";
import { logger } from "../lib/logger.js";
import multer from 'multer';

const router = express.Router();

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/upload/:claimID', upload.single('document'), async (req, res) => {
    try {
        const claim = await Claim.findOne({ claimID: req.params.claimID });
        if (!claim) {
            return res.status(404).send('Claim not found');
        }
        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }
        const filePath = req.file.path;
        claim.documents.push(filePath);
        claim.validation_status = 'Processing';
        await claim.save();

        const channel = getChannel();
        if (channel) {
            const msg = JSON.stringify({
                task: "verify_document",
                claimID: claim.claimID,
                filePath: filePath
            });
            channel.sendToQueue('document_processing', Buffer.from(msg));
            logger.info("Sent message to RabbitMQ for document verification", { claimID: claim.claimID });
        }

        res.send('Document uploaded and sent for processing');
    } catch (error) {
        logger.error("Error processing document upload", { error: error.message });
        res.status(500).send('Error processing document');
    }
});

export default router;