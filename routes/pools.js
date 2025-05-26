const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getAllTokenMetadata } = require("../rpc-utils/token");
const { formatPools } = require("../utils/utils");
const { getLiquidityPercentPerLevel } = require("../rpc-utils/addLiquidity");

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


function formatTokenAmount(amount, decimals) {
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toFixed(4);
}

function formatPoolForLP(poolData, tokenMetadata) {
    const { pool } = poolData.result;

    const tokenADecimals = tokenMetadata.find(t => t.sc_address === pool.token_a)?.decimals ?? 24;
    const tokenBDecimals = tokenMetadata.find(t => t.sc_address === pool.token_b)?.decimals ?? 24;

    const tokenA = tokenMetadata.find(t => t.sc_address === pool.token_a);
    const tokenB = tokenMetadata.find(t => t.sc_address === pool.token_b);

    const formattedFeeLevels = pool.fee_levels.map(fee => ({
        fee_rate: Number(fee.fee_rate),
        amount_a: formatTokenAmount(fee.amount_a, tokenADecimals),
        amount_b: formatTokenAmount(fee.amount_b, tokenBDecimals),
        tvl: Number(fee.tvl).toFixed(4),
        effective_tvl: Number(fee.effective_tvl).toFixed(4),
        volume_24h: Number(fee.volume_24h).toFixed(4),
        volume_7d: Number(fee.volume_7d).toFixed(4),
        fee_24h: Number(fee.fee_24h).toFixed(4),
        fee_7d: Number(fee.fee_7d).toFixed(4),
    }));

    return {
        pool_id: pool.id,
        token_a: tokenA.symbol,
        token_b: tokenB.symbol,
        total_amount_a: formatTokenAmount(pool.total_amount_a, tokenADecimals),
        total_amount_b: formatTokenAmount(pool.total_amount_b, tokenBDecimals),
        spot_price: Number(pool.spot_price).toFixed(4),
        tvl: Number(pool.tvl).toFixed(4),
        effective_tvl: Number(pool.effective_tvl).toFixed(4),
        volume_24h: Number(pool.volume_24h).toFixed(4),
        volume_7d: Number(pool.volume_7d).toFixed(4),
        lp_fee_24h: Number(pool.lp_fee_24h).toFixed(4),
        lp_fee_7d: Number(pool.lp_fee_7d).toFixed(4),
        fee_levels: formattedFeeLevels,
    };
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

        const tokens = await getAllTokenMetadata() || [];

        const pool = formatPoolForLP(response.data, tokens);

        return res.status(200).json({ pool_details: pool });
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

        if (!response.data?.result?.pool_exist) {
            return res.status(400).json({ error: `${tokenASymbol}/${tokenBSymbol} pool doesn't exist.` });
        }

        const feeLevelResult = await getLiquidityPercentPerLevel(fromTokenAddress, toTokenAddress);
        const percents = feeLevelResult.percents;

        const maxIndex = percents.indexOf(Math.max(...percents));

        const spotPrice = response.data?.result?.prices[maxIndex];

        return res.status(200).json({ spot_price: spotPrice });
    } catch (error) {
        console.error("Error fetching pool spot price:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;