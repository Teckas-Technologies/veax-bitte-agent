const VEAX_POOL_RPC_URL = 'https://veax-liquidity-pool.veax.com/v1/rpc';
const VEAX_POOL_MANAGEMENT_RPC_URL = 'https://veax-pool-management.veax.com/v1/rpc'

async function getLiquidityPercentPerLevel(tokenA, tokenB) {

    const payload = {
        jsonrpc: "2.0",
        method: "chart_liquidity_percent_per_level",
        params: {
            token_a: tokenA,
            token_b: tokenB,
        },
        id: 0,
    };

    try {
        const response = await fetch(VEAX_POOL_RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        return result.result;
    } catch (error) {
        console.error('Error fetching liquidity percent per level:', error);
        return null;
    }
}

async function getPoolSpotPrice(tokenA, tokenB) {

    const payload = {
        jsonrpc: "2.0",
        method: "get_pool_spot_price",
        params: {
            token_a: tokenA,
            token_b: tokenB,
        },
        id: 0,
    };

    try {
        const response = await fetch(VEAX_POOL_RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        return result.result;
    } catch (error) {
        console.error('Error fetching pool spot price:', error);
        return null;
    }
}

async function getPoolLeverage(tokenA, tokenB) {

    const payload = {
        jsonrpc: "2.0",
        method: "get_pool_leverage",
        params: {
            token_a: tokenA,
            token_b: tokenB,
        },
        id: 0,
    };

    try {
        const response = await fetch(VEAX_POOL_MANAGEMENT_RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        return result.result;
    } catch (error) {
        console.error('Error fetching pool leverage:', error);
        return null;
    }
}

module.exports = {
    getPoolLeverage,
    getPoolSpotPrice,
    getLiquidityPercentPerLevel
}

// Example usage:
// getPoolLeverage(
//   'wrap.near',
//   '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1'
// ).then(data => console.log(data));


// Example usage:
// getPoolSpotPrice(
//   'wrap.near',
//   '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1'
// ).then(data => console.log(data));


// Example usage:
// getLiquidityPercentPerLevel(
//   'wrap.near',
//   '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1'
// ).then(data => console.log(data));