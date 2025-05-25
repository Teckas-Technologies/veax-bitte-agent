const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getAllTokenMetadata } = require("../rpc-utils/token");
const { formatPools } = require("../utils/utils");

const VEAX_API_URL = "https://veax-liquidity-pool.veax.com/v1/rpc";

function categorizeAndRankPools(pools) {
    const bestPools = [];
    const riskyPools = [];

    pools.forEach(pool => {
        const totalLiquidity = pool.liquidities.reduce((acc, val) => acc + parseFloat(val), 0);
        const spotPrice = parseFloat(pool.spot_price);
        const stability = Math.abs(spotPrice - 1); // Closer to 1 is more stable

        const poolData = {
            ...pool,
            totalLiquidity,
            stability
        };

        if (stability <= 0.05) { // Stable pools (Best Pools)
            bestPools.push(poolData);
        } else { // Unstable pools (Risky Pools)
            riskyPools.push(poolData);
        }
    });

    // Sort by liquidity in descending order
    bestPools.sort((a, b) => b.totalLiquidity - a.totalLiquidity);
    riskyPools.sort((a, b) => b.totalLiquidity - a.totalLiquidity);

    return { bestPools, riskyPools };
}

router.get("/", async (req, res) => {
    try {
        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "get_pools",
                params: {}
            },
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                }
            }
        );

        const { bestPools, riskyPools } = categorizeAndRankPools(response.data?.result?.pools);

        const formattedBestPools = await formatPools(bestPools);
        const formattedRiskyPools = await formatPools(riskyPools);

        return res.status(200).json({ pools: [...formattedBestPools, ...formattedRiskyPools] });
    } catch (error) {
        console.error("Error fetching pools:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/by-tokens", async (req, res) => {
    const { tokenASymbol, tokenBSymbol } = req.query;

    if (!tokenASymbol || !tokenBSymbol) {
        return res.status(400).json({ error: "tokenASymbol and tokenBSymbol are required" });
    }

    const tokens = await getAllTokenMetadata() || [];

    // Find tokens by symbol
    const tokenAData = tokens.find(token => token.symbol?.toLowerCase() === tokenASymbol.toLowerCase());
    const tokenBData = tokens.find(token => token.symbol?.toLowerCase() === tokenBSymbol.toLowerCase());

    // Validate existence
    if (!tokenAData || !tokenBData) {
        return res.status(400).json({
            error: `Could not find tokens for symbols: ${!tokenAData ? tokenASymbol : ''} ${!tokenBData ? tokenBSymbol : ''}`
        });
    }

    const fromTokenAddress = tokenAData.sc_address;
    const toTokenAddress = tokenBData.sc_address;

    try {
        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "liquidity_pool_by_token_pair",
                params: {
                    token_a: fromTokenAddress,
                    token_b: toTokenAddress
                }
            },
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("RES: ", response.data)

        return res.status(200).json(response.data);
    } catch (error) {
        console.error("Error fetching pools:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/best-pools", async (req, res) => {
    try {
        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "get_pools",
                params: {}
            },
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                }
            }
        );

        const { bestPools } = categorizeAndRankPools(response.data?.result?.pools);

        const formattedBestPools = await formatPools(bestPools);

        return res.status(200).json({ bestPools: formattedBestPools });
    } catch (error) {
        console.error("Error fetching pools:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/risky-pools", async (req, res) => {
    try {
        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "get_pools",
                params: {}
            },
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                }
            }
        );

        const { riskyPools } = categorizeAndRankPools(response.data?.result?.pools);

        const formattedRiskyPools = await formatPools(riskyPools);

        return res.status(200).json({ riskyPools: formattedRiskyPools });
    } catch (error) {
        console.error("Error fetching pools:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/last-update", async (req, res) => {
    try {
        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "get_last_pool_update_for_each_pool",
                params: {}
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
        console.error("Error fetching last pool updates:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/spot-price", async (req, res) => {
    try {
        const { tokenASymbol, tokenBSymbol } = req.query;

        if (!tokenASymbol || !tokenBSymbol) {
            return res.status(400).json({ error: "tokenASymbol and tokenBSymbol are required" });
        }

        const tokens = await getAllTokenMetadata() || [];

        // Find tokens by symbol
        const tokenAData = tokens.find(token => token.symbol?.toLowerCase() === tokenASymbol.toLowerCase());
        const tokenBData = tokens.find(token => token.symbol?.toLowerCase() === tokenBSymbol.toLowerCase());

        // Validate existence
        if (!tokenAData || !tokenBData) {
            return res.status(400).json({
                error: `Could not find tokens for symbols: ${!tokenAData ? tokenASymbol : ''} ${!tokenBData ? tokenBSymbol : ''}`
            });
        }

        const fromTokenAddress = tokenAData.sc_address;
        const toTokenAddress = tokenBData.sc_address;

        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "get_pool_spot_price",
                params: { token_a: fromTokenAddress, token_b: toTokenAddress }
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
        console.error("Error fetching pool spot price:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;