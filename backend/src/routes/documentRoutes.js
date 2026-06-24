import express from "express";
import Claim from "../models/claim.model.js";
const router = express.Router();
import multer from 'multer';
import path from "path";
import { getChannel } from "../lib/rabbitmq.js";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/upload/:claimID', upload.single('document'), async (req, res) => {
    const claim = await Claim.findOne({ claimID: req.params.claimID });
    if (claim) {
        const filePath = req.file.path;
        claim.documents.push(filePath);
        await claim.save();

        const channel = getChannel();
        if (channel) {
            const msg = JSON.stringify({
                task: "verify_document",
                claimID: claim.claimID,
                filePath: filePath
            });
            channel.sendToQueue('document_processing', Buffer.from(msg));
            console.log("Sent message to RabbitMQ:", msg);
        }

        res.send('Document uploaded and sent for processing');
    } else {
        res.status(404).send('Claim not found');
    }
});

export default router;