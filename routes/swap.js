const express = require("express");
const router = express.Router();
const axios = require("axios");
const { fetchTokenDecimals, parseTokenAmount } = require("../utils/utils");
const { estimateSwapExactIn } = require("../utils/swapUtils");

const VEAX_CONTRACT_ADDRESS = "veax.near";

router.get("/", async (req, res) => {
    try {
        const { fromTokenAddress, toTokenAddress, walletAddress, amount, slippage } = req.query;

        if (!fromTokenAddress || !toTokenAddress || !walletAddress || !amount) {
            return res.status(400).json({ error: "fromTokenAddress, toTokenAddress, walletAddress and amount are required" });
        }

        // Fetch token decimals
        const decimalsA = await fetchTokenDecimals(fromTokenAddress);
        const decimalsB = await fetchTokenDecimals(toTokenAddress);

        console.log("AI slippage:", slippage)

        let customSlippage;
        if(slippage !== undefined) {
            customSlippage = slippage
        } else {
            customSlippage = "0.005"
        }

        const tokenAAmount = parseFloat(amount);
        const tokenBAmount = await estimateSwapExactIn(fromTokenAddress, toTokenAddress, amount, customSlippage);

        // Convert to Yocto format
        const parsedFromTokenAmount = parseTokenAmount(tokenAAmount, decimalsA);
        const parsedToTokenAmount = parseTokenAmount(tokenBAmount?.data?.result?.amount_b_expected, decimalsB);

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
                            deposit: "0"
                        }
                    }
                ]
            },
            {
                receiverId: fromTokenAddress,
                actions: [
                    {
                        type: "FunctionCall",
                        params: {
                            methodName: "ft_transfer_call",
                            args: {
                                receiver_id: VEAX_CONTRACT_ADDRESS,
                                amount: parsedFromTokenAmount.toString(),
                                msg: JSON.stringify([
                                    "Deposit",
                                    {
                                        SwapExactIn: {
                                            token_in: fromTokenAddress,
                                            token_out: toTokenAddress,
                                            amount: parsedFromTokenAmount.toString(),
                                            amount_limit: parsedToTokenAmount 
                                        }
                                    },
                                    { Withdraw: [fromTokenAddress, "0", null] },
                                    { Withdraw: [toTokenAddress, "0", null] }
                                ])
                            },
                            gas: "200000000000000",
                            deposit: "1",
                        }
                    }
                ]
            }
        ]

        return res.status(200).json({ transactionData });
    } catch (error) {
        console.error("Error swaping tokens:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;