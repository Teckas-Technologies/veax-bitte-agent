const axios = require("axios");

// Fetch token decimals dynamically
const fetchTokenDecimals = async (tokenId) => {
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

        if (response.data.result && response.data.result.result) {
            const metadata = JSON.parse(Buffer.from(response.data.result.result).toString());
            return metadata.decimals || 0;
        }
    } catch (error) {
        console.error(`Error fetching decimals for ${tokenId}:`, error.message);
        return 0; // Default to 0 if unknown
    }
};

// Convert human-readable token amounts to Yocto format
const parseTokenAmount = (amount, decimals) => {
    return BigInt(Math.floor(parseFloat(amount) * 10 ** decimals)).toString();
};

const getHighestLiquidityFeeRate = (data) => {
    if (!data || !data.result || !data.result.pool || !data.result.pool.fee_levels) {
        console.error("Invalid data format");
        return null;
    }

    const feeLevels = data.result.pool.fee_levels;

    // Find the fee level with the highest liquidity
    const highestLiquidityFee = feeLevels.reduce((max, fee) => {
        return (parseFloat(fee.liquidity) > parseFloat(max.liquidity)) ? fee : max;
    }, feeLevels[0]);

    return highestLiquidityFee.fee_rate;
};

// Fetch dynamic tick & amount ranges from Veax API
const fetchHighLiquidityFeeLevel = async (tokenA, tokenB) => {
    try {
        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "liquidity_pool_by_token_pair",
                params: {
                    token_a: tokenA,
                    token_b: tokenB
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

        const highLiquidutyFeeRate = getHighestLiquidityFeeRate(response.data);
        return highLiquidutyFeeRate;
    } catch (error) {
        console.error("Error fetching tick & amount ranges:", error.message);
    }
};


// ================ TEST Functions starts here ============

const VEAX_ESTIMATION_API_URL = "https://veax-estimation-service.veax.com/v1/rpc";

// Fetch dynamic tick & amount ranges from Veax API
const fetchTickAndAmountRanges = async (tokenA, tokenB, amountA, amountB, feeRate = 2) => {
    try {
        const response = await axios.post(
            VEAX_ESTIMATION_API_URL,
            {
                jsonrpc: "2.0",
                id: "liquidity-position-estimation",
                method: "estimate_liquidity_position",
                params: {
                    token_a: tokenA,
                    token_b: tokenB,
                    slippage_tolerance: 0.005, // 0.5% slippage
                    price: "1", // Default to 1 if not available
                    amount_a: amountA.toString(),
                    amount_b: amountB.toString(),
                    fee_rate: feeRate,
                    lower_tick: -32,  // Let API return correct values
                    upper_tick: 47,
                    skip_incentiviation: true
                }
            },
            { headers: { Accept: "application/json", "Content-Type": "application/json" } }
        );

        console.log("RES: ", response.data)
        return response.data

        // const { lower_tick, upper_tick, amount_a, amount_b } = response.data.result;



        // return {
        //     lowerTick: lower_tick,
        //     upperTick: upper_tick,
        //     amountRanges: [
        //         { min: "0", max: amount_a.toString() },
        //         { min: "0", max: amount_b.toString() }
        //     ]
        // };
    } catch (error) {
        console.error("Error fetching tick & amount ranges:", error.message);
        return {
            lowerTick: -37,  // Default fallback
            upperTick: 43,    // Default fallback
            amountRanges: [
                { min: "0", max: amountA.toString() },
                { min: "0", max: amountB.toString() }
            ]
        };
    }
};

const VEAX_API_URL = "https://veax-liquidity-pool.veax.com/v1/rpc";

// Fetch market price using Veax API
const fetchMarketPrice = async (tokenA, tokenB) => {
    try {
        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                method: "get_pool_spot_price",
                params: {
                    token_a: tokenA,
                    token_b: tokenB
                }
            },
            { headers: { Accept: "application/json", "Content-Type": "application/json" } }
        );

        console.log("RES: ", response.data);
        if (!response.data.result.pool_exist) {
            return { success: false, data: null, message: "This pair of pool doesn't exist!" }
        }

        return { success: true, price: response.data.result.prices[0], message: "Fetching market price successfully!" }
    } catch (error) {
        console.error("Error fetching market price:", error.message);
        return { success: false, data: null, message: error.message }
    }
};


module.exports = {
    fetchTokenDecimals,
    parseTokenAmount,
    fetchTickAndAmountRanges,
    fetchMarketPrice,
    fetchHighLiquidityFeeLevel
}