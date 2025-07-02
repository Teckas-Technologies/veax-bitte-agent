const express = require("express");
const router = express.Router();
const { format } = require("near-api-js").utils;
const { parseTokenAmount } = require("../utils/utils");
const { getPoolSpotPrice, getLiquidityPercentPerLevel, getPoolLeverage } = require("../rpc-utils/addLiquidity");
const { formatSlippage, calculateEqualTicks } = require("../utils/liquidityUtils");
const { estimateLiquidityPosition } = require("../rpc-utils/estimation");
const { getAllTokenMetadata } = require("../rpc-utils/token");
const { getFTBalance } = require("../rpc-utils/account");
const { getUnregisteredTokens } = require("../utils/swapUtils");
const { DEFAULT_GAS, MIN_GAS } = require("../constants/liquidity");

const VEAX_CONTRACT_ADDRESS = "veax.near";

router.get("/", async (req, res) => {
    try {
        const { tokenSymbolA, tokenSymbolB, walletAddress, amount, feeTier = "" } = req.query;

        if (!tokenSymbolA || !tokenSymbolB) {
            return res.status(400).json({ error: "tokenA and tokenB are required" });
        }

        if (!walletAddress || !amount) {
            return res.status(400).json({ error: "walletAddress and amount are required" });
        }

        const tokens = await getAllTokenMetadata() || [];

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

        // if (!result.pool_exist) {
        //     return res.status(400).json({ error: "Pool doesn't exist." });
        // }

        const slippage = await formatSlippage("0.5");

        const feeLevelResult = await getLiquidityPercentPerLevel(tokenA, tokenB);
        const percents = feeLevelResult.percents;
        
        const feePercents = [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28];
        const convertedFeeTier = feeTier.replace("%", "");

        const feeLevels = [1, 2, 4, 8, 16, 32, 64, 128];
        // const maxIndex = percents.indexOf(Math.max(...percents));
        const selectedIndex = feePercents.indexOf(parseFloat(convertedFeeTier));
        const maxIndex = selectedIndex !== -1 ? selectedIndex : percents.indexOf(Math.max(...percents));

        const feeRate = feeLevels[maxIndex];
        let price = result.prices[maxIndex];  // spot price

        if (!result.pool_exist) {
            price = '1'
        }

        const leverageResult = await getPoolLeverage(tokenA, tokenB);

        let leverage = 1000;
        if (maxIndex !== -1) {
            leverage = leverageResult?.leverages[maxIndex];
        }

        const { minTick, maxTick } = await calculateEqualTicks({ aDecimals: tokenBData?.decimals, bDecimals: tokenAData?.decimals, price: price, leverage });

        console.log("TICKS: ", minTick, maxTick)

        const estimation = await estimateLiquidityPosition({ tokenB, tokenA, slippageTolerance: slippage, feeRate, lowerTick: minTick, upperTick: maxTick, amount, price, poolExist: result?.pool_exist });

        // console.log("Estimation: ", estimation);

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

        const tokenContracts = [tokenA, tokenB];

        const unregisteredTokenContracts = await getUnregisteredTokens(walletAddress, tokenContracts);

        const isTokensRegistered = !unregisteredTokenContracts.length;

        const deposit = estimation?.storage_cost

        let storageDeposit = BigInt(deposit?.open_position || '0');
        // if (!accountHasDeposit) storageDeposit += BigInt(deposit?.init_account || '0');
        if (!isTokensRegistered) storageDeposit += BigInt(deposit?.register_token || '0') * BigInt(unregisteredTokenContracts.length);
        if (!result.pool_exist) storageDeposit += BigInt(deposit?.create_pool || '0');

        const ACTIONS_ADD_LIQUIDITY_VEAX_CONTRACT = [
            {
                type: "FunctionCall",
                params: {
                    methodName: "storage_deposit",
                    args: { account_id: walletAddress, registration_only: false },
                    gas: isTokensRegistered ? DEFAULT_GAS : MIN_GAS,
                    deposit: storageDeposit.toString(),
                }
            }
        ]

        if (!isTokensRegistered) {
            ACTIONS_ADD_LIQUIDITY_VEAX_CONTRACT.push({
                type: "FunctionCall",
                params: {
                    methodName: "register_tokens",
                    args: { token_ids: unregisteredTokenContracts },
                    gas: MIN_GAS,
                    deposit: "1"
                }
            })
        }

        const transactionData = [
            {
                receiverId: VEAX_CONTRACT_ADDRESS,
                actions: ACTIONS_ADD_LIQUIDITY_VEAX_CONTRACT
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
