const express = require('express');
const router = express.Router();

const BITTE_API_KEY = process.env.BITTE_API_KEY;
const BITTE_API_URL = process.env.BITTE_API_URL || "https://api.bitte.ai/v1";

router.get("/history", async (req, res) => {
    try {
        const id = req.query.id;

        if (!id) {
            return res.status(400).json({ error: 'Missing id parameter' });
        }

        const url = `${BITTE_API_URL}/history?id=${encodeURIComponent(id)}`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${BITTE_API_KEY}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText });
        }

        const result = await response.json();
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error >> ", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
