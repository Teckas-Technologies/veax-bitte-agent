const express = require('express');
const router = express.Router();
const { Readable } = require('stream');

const BITTE_API_KEY = process.env.BITTE_API_KEY;
const BITTE_API_URL = process.env.BITTE_API_URL || "https://api.bitte.ai/v1";

router.post("/chat", async (req, res) => {
    try {
        const upstreamResponse = await fetch(`${BITTE_API_URL}/chat`, {
            method: 'POST',
            body: JSON.stringify(req.body),
            headers: {
                'Authorization': `Bearer ${BITTE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Clone and clean up headers
        const headers = {};
        upstreamResponse.headers.forEach((value, key) => {
            if (key.toLowerCase() !== 'content-encoding') {
                headers[key] = value;
            }
        });

        // Stream the response body
        res.writeHead(upstreamResponse.status, headers);

        // upstreamResponse.body.pipe(res);

        // Properly pipe ReadableStream in Node 18+
        const stream = Readable.from(upstreamResponse.body);
        stream.pipe(res);
    } catch (error) {
        console.error("Error >> ", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
