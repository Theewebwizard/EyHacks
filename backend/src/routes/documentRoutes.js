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

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        const extname = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
        
        if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(extname)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDFs and images (PNG, JPG, JPEG) are allowed.'));
        }
    }
});

router.post('/upload/:claimID', (req, res, next) => {
    upload.single('document')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
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