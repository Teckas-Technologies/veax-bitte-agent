const axios = require("axios");
const { getAllTokenMetadata } = require("../rpc-utils/token");
const { VEAX_MAINNET_URL } = require("./constants");

// Fetch token decimals dynamically
const fetchTokenDecimals = async (tokenId) => {
    try {
        const response = await axios.post(`${VEAX_MAINNET_URL}`, {
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
        return 24; // Default to 0 if unknown
    }
};

// Convert human-readable token amounts to Yocto format
const parseTokenAmount = (amount, decimals) => {
    return BigInt(Math.floor(parseFloat(amount) * 10 ** decimals)).toString();
};

// Convert Yocto format to human-readable token amount
const formatTokenAmount = (yoctoAmount, decimals) => {
    const amountBig = BigInt(yoctoAmount);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = amountBig / divisor;
    const fraction = amountBig % divisor;

    // Pad leading zeros in fractional part based on decimals, then trim trailing zeros
    const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');

    return fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
};

// use this in plugin json in pools spec, if need reserve data
// "reserve_a": {
//     "type": "string",
//     "description": "Reserve amount of token A"
// },
// "reserve_b": {
//     "type": "string",
//     "description": "Reserve amount of token B"
// },

const formatWithFourDecimals = (value) => {
    return Number(value).toFixed(4).split("e")[0]
};

const formatPools = async (pools) => {
    const tokens = await getAllTokenMetadata() || [];

    const tokenMap = Object.fromEntries(tokens.map(token => [token.sc_address, token]));

    const formattedPools = pools.map(pool => {
        const tokenAMeta = tokenMap[pool.token_a];
        const tokenBMeta = tokenMap[pool.token_b];

        return {
            token_a: tokenAMeta?.symbol || pool.token_a,
            token_a_sc_address: tokenAMeta?.sc_address || pool.token_a,
            token_a_decimals: tokenAMeta?.decimals,
            token_b: tokenBMeta?.symbol || pool.token_b,
            token_b_sc_address: tokenBMeta?.sc_address || pool.token_b,
            token_b_decimals: tokenBMeta?.decimals,
            // reserve_a: pool.reserve_a,
            // reserve_b: pool.reserve_b,
            spot_price: pool.spot_price,
            stability: formatWithFourDecimals(pool.stability),
            total_liquidity: formatWithFourDecimals(pool.totalLiquidity)
        };
    });

    return formattedPools
}


module.exports = {
    fetchTokenDecimals,
    parseTokenAmount,
    formatTokenAmount,
    formatPools
}