const VEAX_ESTIMATION_RPC_URL = 'https://veax-estimation-service.veax.com/v1/rpc';

async function estimateLiquidityPosition({
    tokenA,
    tokenB,
    slippageTolerance,
    feeRate,
    lowerTick,
    upperTick,
    amount
}) {

    console.log("DATA: ", tokenA, tokenB, slippageTolerance, feeRate, lowerTick, upperTick, amount)

    const payload = {
        jsonrpc: "2.0",
        method: "estimate_liquidity_position",
        params: {
            token_a: tokenA,
            token_b: tokenB,
            slippage_tolerance: slippageTolerance,
            fee_rate: feeRate,
            lower_tick: lowerTick,
            upper_tick: upperTick,
            amount_a: amount
        },
        id: 0
    };

    try {
        const response = await fetch(VEAX_ESTIMATION_RPC_URL, {
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

        console.log("RES:", result)

        return result.result;
    } catch (error) {
        console.error('Error estimating liquidity position:', error);
        return null;
    }
}

module.exports = {
    estimateLiquidityPosition
}

// Example usage:
// estimateLiquidityPosition({
//     tokenA: 'wrap.near',
//     tokenB: '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
//     slippageTolerance: 0.005,
//     feeRate: 128,
//     lowerTick: 400101,
//     upperTick: 405442,
//     amount: "1"
// }).then(data => console.log(data));
