const express = require("express");
const router = express.Router();
const { format } = require("near-api-js").utils;
const { fetchTokenDecimals, parseTokenAmount } = require("../utils/utils");
const { getPoolSpotPrice, getLiquidityPercentPerLevel, getPoolLeverage } = require("../rpc-utils/addLiquidity");
const { formatSlippage, calculateEqualTicks } = require("../utils/liquidity-utils");
const { estimateLiquidityPosition } = require("../rpc-utils/estimation");
const { getAllTokenMetadata } = require("../rpc-utils/token");
const { getFTBalance } = require("../rpc-utils/account");

const VEAX_CONTRACT_ADDRESS = "veax.near";

router.get("/", async (req, res) => {
    try {
        const { tokenSymbolA, tokenSymbolB, walletAddress, amount } = req.query;

        if (!tokenSymbolA || !tokenSymbolB) {
            return res.status(400).json({ error: "tokenA and tokenB are required" });
        }

        if (!walletAddress || !amount) {
            return res.status(400).json({ error: "walletAddress and amount are required" });
        }

        const tokens = await getAllTokenMetadata() || [];

        console.log("Tokens: ", tokens)

        // Find tokens by symbol
        const tokenAData = tokens.find(token => token.symbol?.toLowerCase() === tokenSymbolA.toLowerCase());
        const tokenBData = tokens.find(token => token.symbol?.toLowerCase() === tokenSymbolB.toLowerCase());

        // Validate existence
        if (!tokenAData || !tokenBData) {
            return res.status(400).json({
                error: `Could not find tokens for symbols: ${!tokenAData ? tokenSymbolA : ''} ${!tokenBData ? tokenSymbolB : ''}`
            });
        }

        const tokenA = tokenAData.sc_address;
        const tokenB = tokenBData.sc_address;

        console.log("Token A Address:", tokenA);
        console.log("Token B Address:", tokenB);

        const result = await getPoolSpotPrice(tokenA, tokenB);

        if (!result.pool_exist) {
            return res.status(400).json({ error: "Pool doesn't exist." });
        }

        console.log("prices: ", result.prices)

        const slippage = await formatSlippage("0.5");

        console.log("SLIPPAGE: ", slippage);

        const feeLevelResult = await getLiquidityPercentPerLevel(tokenA, tokenB);

        const percents = feeLevelResult.percents;

        const feeLevels = [1, 2, 4, 8, 16, 32, 64, 128];

        // Find the index of the highest percentage
        const maxIndex = percents.indexOf(Math.max(...percents));

        // Get the corresponding fee level
        const feeRate = feeLevels[maxIndex] || 2;

        console.log("FEE LEVEL:", feeRate);

        const price = result.prices[maxIndex];  // spot price

        console.log("PRICE:", price);

        const leverageResult = await getPoolLeverage(tokenA, tokenB);

        let leverage = 1000;

        if (maxIndex !== -1) {
            leverage = leverageResult?.leverages[maxIndex] || 1000
        }

        console.log("LEVERAGE: ", leverage)

        const { minTick, maxTick, minPrice, maxPrice, minFormat, maxFormat } = await calculateEqualTicks({ aDecimals: tokenAData?.decimals, bDecimals: tokenBData?.decimals, price: price, leverage });

        console.log("Ranges: ", minPrice, maxPrice, minFormat, maxFormat)

        console.log("TICKS: ", minTick, maxTick)

        const estimation = await estimateLiquidityPosition({ tokenB, tokenA, slippageTolerance: slippage, feeRate, lowerTick: minTick, upperTick: maxTick, amount });

        console.log("Estimation: ", estimation);

        if (!estimation) {
            return res.status(400).json({ error: "Add liquidity estimation has been failed" });
        }

        const { min_token_a, min_token_b, max_token_a, max_token_b } = estimation;

        // Convert to Yocto format
        const maxAmountA = parseTokenAmount(max_token_a, tokenAData?.decimals);
        const maxAmountB = parseTokenAmount(max_token_b, tokenBData?.decimals);

        const minAmountA = parseTokenAmount(min_token_a, tokenAData?.decimals);
        const minAmountB = parseTokenAmount(min_token_b, tokenBData?.decimals);

        const balanceA = BigInt(await getFTBalance(tokenA, walletAddress));
        const balanceB = BigInt(await getFTBalance(tokenB, walletAddress));

        const maxAmountABigInt = BigInt(maxAmountA);
        const maxAmountBBigInt = BigInt(maxAmountB);

        if (balanceA < maxAmountABigInt) {
            return res.status(400).json({
                error: `Insufficient balance for Token A (${tokenAData?.symbol}). Required: ${maxAmountABigInt}, Available: ${balanceA}, Decimal: ${tokenAData?.decimals}`
            });
        }

        if (balanceB < maxAmountBBigInt) {
            return res.status(400).json({
                error: `Insufficient balance for Token B (${tokenBData?.symbol}). Required: ${maxAmountBBigInt}, Available: ${balanceB}, Decimal: ${tokenBData?.decimals}`
            });
        }

        const depositStorage = format.parseNearAmount("0.02");

        const transactionData = [
            {
                receiverId: VEAX_CONTRACT_ADDRESS,
                actions: [
                    {
                        type: "FunctionCall",
                        params: {
                            methodName: "storage_deposit",
                            args: { account_id: walletAddress, registration_only: false },
                            gas: "30000000000000",
                            deposit: depositStorage,
                        }
                    },
                    {
                        type: "FunctionCall",
                        params: {
                            methodName: "register_tokens",
                            args: { token_ids: [tokenA, tokenB] },
                            gas: "200000000000000",
                            deposit: "1",
                        }
                    }
                ]
            },
            {
                receiverId: tokenA,
                actions: [
                    {
                        type: "FunctionCall",
                        params: {
                            methodName: "ft_transfer_call",
                            args: {
                                receiver_id: VEAX_CONTRACT_ADDRESS,
                                amount: maxAmountA,
                                msg: JSON.stringify(["Deposit"])
                            },
                            gas: "200000000000000",
                            deposit: "1",
                        }
                    }
                ]
            },
            {
                receiverId: tokenB,
                actions: [
                    {
                        type: "FunctionCall",
                        params: {
                            methodName: "ft_transfer_call",
                            args: {
                                receiver_id: VEAX_CONTRACT_ADDRESS,
                                amount: maxAmountB,
                                msg: JSON.stringify([
                                    "Deposit",
                                    {
                                        OpenPosition: {
                                            tokens: [tokenA, tokenB],
                                            fee_rate: feeRate,
                                            position: {
                                                amount_ranges: [
                                                    { min: minAmountA, max: maxAmountA },
                                                    { min: minAmountB, max: maxAmountB }
                                                ],
                                                ticks_range: [minTick, maxTick]
                                            }
                                        }
                                    },
                                    { Withdraw: [tokenA, "0", null] },
                                    { Withdraw: [tokenB, "0", null] }
                                ])
                            },
                            gas: "200000000000000",
                            deposit: "1",
                        }
                    }
                ]
            }
        ];

        return res.status(200).json({ transactionData });
    } catch (error) {
        console.error("Error adding liquidity:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
