const express = require("express");
const router = express.Router();
const axios = require("axios");

const VEAX_API_URL = "https://veax-liquidity-pool.veax.com/v1/rpc";

const fetchTokenMetadata = async (tokenId) => {
    try {
        const response = await axios.post(`https://rpc.mainnet.near.org`, {
            jsonrpc: "2.0",
            id: "1",
            method: "query",
            params: {
                request_type: "call_function",
                finality: "final",
                account_id: tokenId,
                method_name: "ft_metadata",
                args_base64: ""
            }
        });

        if (response.data.result?.result) {
            const metadata = JSON.parse(Buffer.from(response.data.result.result).toString());
            return {
                name: metadata.name || "Unknown",
                symbol: metadata.symbol || "N/A",
            };
        }
    } catch (error) {
        console.error(`Error fetching metadata for ${tokenId}:`, error.message);
        return { name: "Unknown", symbol: "N/A" };
    }
};

router.get("/", async (req, res) => {
    try {
        const { pageNo, searchText } = req.query;

        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "tokens_list",
                params: {
                    filter: {
                        page: parseInt(pageNo) || 1,
                        limit: 10,
                        sort: "NONE",
                        is_desc: true,
                        search: searchText || ""
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

        let tokens = response.data.result.tokens || [];

        // Fetch metadata in parallel
        const tokenMetadataPromises = tokens.map(async (token) => {
            const metadata = await fetchTokenMetadata(token.sc_address);
            return {
                ...token,
                name: metadata.name,
                symbol: metadata.symbol,
            };
        });

        tokens = await Promise.all(tokenMetadataPromises);

        return res.status(200).json({ tokens, total: response.data.result.total });
    } catch (error) {
        console.error("Error fetching tokens list:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/liquidity-paired", async (req, res) => {
    try {
        const { tokenAddress } = req.query;

        if (!tokenAddress) {
            return res.status(400).json({ error: "tokenAddress is required" });
        }

        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "liquidity_paired_tokens",
                params: { token_address: tokenAddress }
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
        console.error("Error fetching liquidity paired tokens:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/price", async (req, res) => {
    try {
        const { tokenAddress } = req.query;

        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "token_current_prices",
                params: {
                    token_addresses: [
                        tokenAddress.toString()
                    ]
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

router.get("/historical-price", async (req, res) => {
    try {
        const { tokenAddress, timestamp } = req.query;

        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "token_historical_prices",
                params: {
                    token_addresses: [tokenAddress], // Default to ["string"] if not provided
                    timestamp: parseInt(timestamp) || 0 // Default to 0 if not provided
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
        console.error("Error fetching token historical prices:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
