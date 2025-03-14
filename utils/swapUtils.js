const VEAX_API_URL = "https://veax-estimation-service.veax.com/v1/rpc/";

async function estimateSwapExactIn(tokenA, tokenB, amountA, slippage) {
    // 0.02 = 2% | 0.01 = 1% | 0.005 = 0.5% | 0.001 = 0.1% Slippage

    let slippageTolerance = 0.005;

    if(slippage === "0.1") {
        slippageTolerance = 0.001
    } else if(slippage === "2") {
        slippageTolerance = 0.02
    } else if(slippage === "1") {
        slippageTolerance = 0.01
    } else {
        slippageTolerance = 0.005
    }

    console.log(slippageTolerance)

    const requestBody = {
        jsonrpc: "2.0",
        id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        method: "estimate_swap_exact_in",
        params: {
            token_a: tokenA,
            token_b: tokenB,
            amount_a: amountA?.toString(),
            slippage_tolerance: slippageTolerance
        }
    };

    try {
        const response = await fetch(VEAX_API_URL, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseJson = await response.json();
        if (!responseJson?.result?.pool_exists) {
            return { success: false, data: null, message: "Pool doesn't have liquidity!"}
        }

        return { success: true, data: responseJson, message: "Got swap out data Successfully!"};
    } catch (error) {
        console.error("Error estimating swap:", error);
        return null;
    }
}

module.exports = {
    estimateSwapExactIn
}
