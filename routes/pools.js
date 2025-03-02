const express = require("express");
const router = express.Router();
const axios = require("axios");

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

        console.log(bestPools[0], bestPools.length, riskyPools[0], riskyPools.length);

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

        const { bestPools, riskyPools } = categorizeAndRankPools(response.data?.result?.pools);

        console.log(bestPools[0], bestPools.length, riskyPools[0], riskyPools.length);

        return res.status(200).json({ bestPools: bestPools});
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

        const { bestPools, riskyPools } = categorizeAndRankPools(response.data?.result?.pools);

        console.log(bestPools[0], bestPools.length, riskyPools[0], riskyPools.length);

        return res.status(200).json({ riskyPools: riskyPools });
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
        const { tokenA, tokenB } = req.query;

        if (!tokenA || !tokenB) {
            return res.status(400).json({ error: "tokenA and tokenB are required" });
        }

        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "get_pool_spot_price",
                params: { token_a: tokenA, token_b: tokenB }
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