const express = require("express");
const router = express.Router();
const { format } = require("near-api-js").utils;
const axios = require("axios");

const VEAX_CONTRACT_ADDRESS = "veax.near";
const VEAX_API_URL = "https://veax-liquidity-pool.veax.com/v1/rpc";

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

// Fetch market price using Veax API
const fetchMarketPrice = async (tokenA, tokenB) => {
    try {
        const response = await axios.post(
            VEAX_API_URL,
            {
                jsonrpc: "2.0",
                id: "price-check",
                method: "token_current_prices",
                params: { token_addresses: [tokenA, tokenB] }
            },
            { headers: { Accept: "application/json", "Content-Type": "application/json" } }
        );

        const prices = response.data?.result?.prices || {};
        if (!prices[tokenA] || !prices[tokenB]) {
            throw new Error(`Price data not found for ${tokenA} or ${tokenB}`);
        }

        return prices[tokenA] / prices[tokenB]; // Convert `tokenA/tokenB` price
    } catch (error) {
        console.error("Error fetching market price:", error.message);
        return 1; // Default to 1:1 if API request fails
    }
};

// Convert price to tick index
const priceToTick = (price) => Math.round(Math.log(price) / Math.log(1.0001));

// Dynamic tick range calculation (5% volatility buffer)
const calculateTickRange = async (tokenA, tokenB) => {
    const price = await fetchMarketPrice(tokenA, tokenB);
    const tickIndex = priceToTick(price);

    const volatilityFactor = 10; // Higher means wider range (~5-10% from price)
    const lowerTick = tickIndex - volatilityFactor;
    const upperTick = tickIndex + volatilityFactor;

    return [lowerTick, upperTick];
};

// Convert human-readable token amounts to Yocto format
const parseTokenAmount = (amount, decimals) => {
    return BigInt(Math.floor(parseFloat(amount) * 10 ** decimals)).toString();
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
        const price = await fetchMarketPrice(tokenA, tokenB);

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
                                                    { min: "0", max: parsedAmountA },
                                                    { min: "0", max: parsedAmountB }
                                                ],
                                                ticks_range: [-37, 43]
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
