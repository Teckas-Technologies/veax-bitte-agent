// TODO In Testing....

const express = require("express");
const router = express.Router();
const { format } = require("near-api-js").utils;
const axios = require("axios");
const { fetchTokenDecimals, parseTokenAmount, fetchMarketPrice } = require("../utils/utils");

const VEAX_CONTRACT_ADDRESS = "veax.near";
const VEAX_API_URL = "https://veax-liquidity-pool.veax.com/v1/rpc";

const priceToTick = (price) => Math.round(Math.log(price) / Math.log(1.0001));

const calculateTickRange = async (tokenA, tokenB) => {
    const response = await fetchMarketPrice(tokenA, tokenB); // Get live price from API
    const tickIndex = priceToTick(response.price);

    const buffer = 0.05; // 5% price range buffer
    const lowerTick = priceToTick(response.price * (1 - buffer)); // 95% of current price
    const upperTick = priceToTick(response.price * (1 + buffer)); // 105% of current price

    return [lowerTick, upperTick];
};

router.get("/", async (req, res) => {
    try {
        const { tokenA, tokenB, walletAddress, amount } = req.query;

        if (!tokenA || !tokenB) {
            return res.status(400).json({ error: "tokenA and tokenB are required" });
        }

        if (!walletAddress || !amount) {
            return res.status(400).json({ error: "walletAddress and amount are required" });
        }

        // Fetch token decimals
        const decimalsA = await fetchTokenDecimals(tokenA);
        const decimalsB = await fetchTokenDecimals(tokenB);

        // Fetch market price
        const response = await fetchMarketPrice(tokenA, tokenB);
        if(!response.success) {
            return res.status(400).json({ error: "Invalid token pair..." });
        }

        const price = response.price;

        console.log(`Market Price: 1 ${tokenA} = ${price} ${tokenB}`);

        // Convert tokenA amount to tokenB equivalent
        const tokenAAmount = parseFloat(amount);
        const tokenBAmount = tokenAAmount * price;

        // Convert to Yocto format
        const parsedAmountA = parseTokenAmount(tokenAAmount, decimalsA);
        const parsedAmountB = parseTokenAmount(tokenBAmount, decimalsB);

        console.log(`Converted Amounts: A=${parsedAmountA} (Yocto), B=${parsedAmountB} (Yocto)`);

        // Calculate dynamic tick range
        const tickRange = await calculateTickRange(tokenA, tokenB);

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
                                amount: parsedAmountA,
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
                                amount: parsedAmountB,
                                msg: JSON.stringify([
                                    "Deposit",
                                    {
                                        OpenPosition: {
                                            tokens: [tokenA, tokenB],
                                            fee_rate: 2,
                                            position: {
                                                amount_ranges: [
                                                    { min: "0", max: parsedAmountA }, // TODO dynamic
                                                    { min: "0", max: parsedAmountB }  // TODO dynamic
                                                ],
                                                ticks_range: tickRange // [-37, 43]  // TODO dynamic
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
