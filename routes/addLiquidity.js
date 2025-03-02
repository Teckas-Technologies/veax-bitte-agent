const express = require("express");
const router = express.Router();
const { format } = require('near-api-js').utils;
const axios = require("axios");

const VEAX_API_URL = "https://veax-liquidity-pool.veax.com/v1/rpc";

router.get("/", async (req, res) => {
    try {
        const { tokenA, tokenB, walletAddress } = req.query;

        if (!tokenA || !tokenB) {
            return res.status(400).json({ error: "tokenA and tokenB are required" });
        }

        // token_a: "wrap.near",
        // token_b: "usdt.tether-token.near",

        const args = {
            token_a: tokenA,
            token_b: tokenB,
            fee_rate: 32,
            position: {
                amount_ranges: [
                    {
                        "min": "1315285157096752804790272",
                        "max": "1356206995577992321695744"
                    },
                    {
                        "min": "5107417",
                        "max": "5251751"
                    }
                ],
                ticks_range: [
                    402546,
                    404189
                ]
            }
        };

        const depositStorage = format.parseNearAmount("0.1");

        const transactionData = [{
            receiverId: "veax.near",
            actions: [
                {
                    type: "FunctionCall",
                    params: {
                        methodName: "storage_deposit",
                        args: { account_id: walletAddress },
                        gas: "25000000000000",
                        deposit: depositStorage,
                    }
                },
                {
                    type: 'FunctionCall',
                    params: {
                        methodName: "open_position",
                        args: args,
                        gas: "275000000000000",
                        deposit: "1"
                    }
                }
            ]
        }];

        return res.status(200).json({ transactionData });
    } catch (error) {
        console.error("Error adding liquidity:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;

