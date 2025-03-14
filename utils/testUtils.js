// TODO In Testing....

const axios = require("axios");
const VEAX_API_URL = "https://veax-liquidity-pool.veax.com/v1/rpc";

const fetchMarketPrice = async (tokenA, tokenB) => {
    const response = await axios.post(
        "https://veax-liquidity-pool.veax.com/v1/rpc",
        {
            jsonrpc: "2.0",
            id: "price-check",
            method: "token_current_prices",
            params: { token_addresses: [tokenA, tokenB] }
        },
        { headers: { Accept: "application/json", "Content-Type": "application/json" } }
    );

    return response.data.result.prices[tokenA] / response.data.result.prices[tokenB];
};

const priceToTick = (price) => Math.round(Math.log(price) / Math.log(1.0001));

const calculateMinMaxAmounts = async (tokenA, tokenB, liquidity) => {
    const price = await fetchMarketPrice(tokenA, tokenB);
    const tickIndex = priceToTick(price);

    // Define buffer (7.02% for volatile, 0.4% for stablecoin pairs)
    const buffer = (tokenA === "usdc" && tokenB === "usdc") ? 0.004 : 0.0702;

    const lowerPrice = price * (1 - buffer);
    const upperPrice = price * (1 + buffer);

    const lowerTick = priceToTick(lowerPrice);
    const upperTick = priceToTick(upperPrice);

    const minAmount = liquidity / upperPrice;
    const maxAmount = liquidity / lowerPrice;

    return { minAmount, maxAmount, lowerTick, upperTick };
};

// Fetch delta value
const calculateDeltaValue = (feerate, concentration) => {
    let baseTickWidth = 887273;

    // Convert feerate to number (if passed as a string)
    const feeRateNum = Number(feerate);

    // Correct fee rate mapping
    const feeRateMap = {
        1: 1774546,
        2: 887273,
        4: 443636,
        8: 221818,
        16: 110909,
        32: 55454,
        64: 27727,
        128: 13863
    };

    if (feeRateNum in feeRateMap) {
        baseTickWidth = feeRateMap[feeRateNum];
    }

    const delta = Math.round(baseTickWidth / concentration); // Ensure integer delta
    return delta;
};

// Calculate tick number
function calculateTickNumber(price) {
    if (price <= 0) {
        throw new Error("Price must be greater than zero");
    }

    const base = 1.0001;
    return Math.log(price) / Math.log(base);
}

// Fetch spotprice of the pool
const spotPriceOfPool = async (tokenA, tokenB) => {
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
        return response.data.result.pool.spot_price;
    } catch (error) {
        console.error("Error fetching tick & amount ranges:", error.message);
    }
};

// Calculate lower & upper tick
const calculateTickRanges = async () => {
    const concentration = 500;
    const delta = calculateDeltaValue(2, concentration); // Pass fee rate as a number
    console.log("DELTA:", delta);

    const spotPrice = await spotPriceOfPool("usdt.tether-token.near", "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1");

    if (!spotPrice) {
        console.log("Failed to fetch spot price");
        return;
    }

    console.log("Spot Price:", spotPrice);

    const tickNumber = calculateTickNumber(spotPrice);
    console.log("Tick Number:", tickNumber);

    const lower_tick = tickNumber - delta;
    const upper_tick = tickNumber + delta;

    console.log("Ticks:", lower_tick, upper_tick);
};

module.exports = {
    calculateMinMaxAmounts,
    calculateTickRanges
}



