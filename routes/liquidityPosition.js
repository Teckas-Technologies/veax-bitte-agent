const express = require("express");
const router = express.Router();
const axios = require("axios");

const VEAX_API_URL = "https://veax-liquidityposition.veax.com/v1/rpc";

router.get("/", async (req, res) => {
    try {
        const { pageNo, walletAddress } = req.query;

        if (!walletAddress) {
            return res.status(400).json({ error: "walletAddress is required" });
        }

        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "liquidity_positions_list",
                params: {
                    account_id: walletAddress,
                    filter: {
                        is_desc: false,
                        limit: 10,
                        page: parseInt(pageNo) || 1,
                        search: "",
                        sort: "NONE"
                    }
                }
            },
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                }
            }
        );

        return res.status(200).json(response.data);
    } catch (error) {
        console.error("Error fetching token current prices:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/position", async (req, res) => {
    try {
        const { positionId } = req.query;

        if (!positionId) {
            return res.status(400).json({ error: "positionId is required" });
        }

        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "position-fetch",
                method: "liquidity_position_details",
                params: {
                    id: positionId
                }
            },
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                }
            }
        );

        return res.status(200).json(response.data);
    } catch (error) {
        console.error("Error fetching liquidity position by ID:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;