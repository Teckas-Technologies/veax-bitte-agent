// "/api/double-swap": {
//     "get": {
//         "operationId": "doubleSwapTokens",
//             "summary": "Execute double swap from one token to mid token to another token.",
//                 "description": "Execute double swap from one token to mid token to another token.",
//                     "parameters": [
//                         {
//                             "name": "firstFromTokenAddress",
//                             "in": "query",
//                             "required": true,
//                             "schema": {
//                                 "type": "string"
//                             },
//                             "description": "The token address of the first from token"
//                         },
//                         {
//                             "name": "firstToTokenAddress",
//                             "in": "query",
//                             "required": true,
//                             "schema": {
//                                 "type": "string"
//                             },
//                             "description": "The token address of the first to token"
//                         },
//                         {
//                             "name": "secondFromTokenAddress",
//                             "in": "query",
//                             "required": true,
//                             "schema": {
//                                 "type": "string"
//                             },
//                             "description": "The token address of the second from token"
//                         },
//                         {
//                             "name": "secondToTokenAddress",
//                             "in": "query",
//                             "required": true,
//                             "schema": {
//                                 "type": "string"
//                             },
//                             "description": "The token address of the second to token"
//                         },
//                         {
//                             "name": "walletAddress",
//                             "in": "query",
//                             "required": true,
//                             "schema": {
//                                 "type": "string"
//                             },
//                             "description": "The near wallet address of the user."
//                         },
//                         {
//                             "name": "amount",
//                             "in": "query",
//                             "required": true,
//                             "schema": {
//                                 "type": "string"
//                             },
//                             "description": "The amount of from token the user want to swap."
//                         },
//                         {
//                             "name": "slippage",
//                             "in": "query",
//                             "required": false,
//                             "schema": {
//                                 "type": "string"
//                             },
//                             "description": "The slippage percentage. Default is 0.5. Others are 0.1, 1, 2"
//                         }
//                     ],
//                         "responses": {
//             "200": {
//                 "description": "A swap was done successfully.",
//                     "content": {
//                     "application/json": {
//                         "schema": {
//                             "type": "object",
//                                 "properties": {
//                                 "transactionData": {
//                                     "type": "array",
//                                         "description": "Array contains the transaction data."
//                                 }
//                             }
//                         }
//                     }
//                 }
//             },
//             "500": {
//                 "description": "Error response",
//                     "content": {
//                     "application/json": {
//                         "schema": {
//                             "type": "object",
//                                 "properties": {
//                                 "error": {
//                                     "type": "string",
//                                         "description": "Error message"
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     }
// },

const express = require("express");
const router = express.Router();
const { fetchTokenDecimals, parseTokenAmount } = require("../utils/utils");
const { estimateSwapExactIn } = require("../utils/swapUtils");

const VEAX_CONTRACT_ADDRESS = "veax.near";

router.get("/", async (req, res) => {
    try {
        const {
            firstFromTokenAddress, firstToTokenAddress,
            secondFromTokenAddress, secondToTokenAddress,
            walletAddress, amount, slippage
        } = req.query;

        if (!firstFromTokenAddress || !firstToTokenAddress || !secondFromTokenAddress || !secondToTokenAddress || !walletAddress || !amount) {
            return res.status(400).json({ error: "Missing required parameters" });
        }

        // Fetch token decimals
        const decimalsFirstFrom = await fetchTokenDecimals(firstFromTokenAddress);
        const decimalsFirstTo = await fetchTokenDecimals(firstToTokenAddress);
        const decimalsSecondTo = await fetchTokenDecimals(secondToTokenAddress);

        // Slippage setting
        let customSlippage = slippage !== undefined ? slippage : "0.005";

        // Parse initial amount
        const tokenAmount = parseFloat(amount);

        // First swap estimation
        const firstSwapEstimate = await estimateSwapExactIn(firstFromTokenAddress, firstToTokenAddress, amount, customSlippage);

        const parsedFirstFromAmount = parseTokenAmount(tokenAmount, decimalsFirstFrom);
        const safeFirstToTokenAmount = firstSwapEstimate?.data?.result?.amount_b_expected * 0.98;  // 2% buffer
        const parsedFirstToAmount = parseTokenAmount(safeFirstToTokenAmount, decimalsFirstTo);

        // Second swap estimation
        const secondSwapEstimate = await estimateSwapExactIn(firstToTokenAddress, secondToTokenAddress, firstSwapEstimate?.data?.result?.amount_b_expected, customSlippage);

        const parsedSecondFromAmount = parseTokenAmount(firstSwapEstimate?.data?.result?.amount_b_expected, decimalsFirstTo);
        const safeSecondToTokenAmount = secondSwapEstimate?.data?.result?.amount_b_expected * 0.98;  // 2% buffer
        const parsedSecondToAmount = parseTokenAmount(safeSecondToTokenAmount, decimalsSecondTo);


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
                receiverId: firstFromTokenAddress,
                actions: [
                    {
                        type: "FunctionCall",
                        params: {
                            methodName: "ft_transfer_call",
                            args: {
                                receiver_id: VEAX_CONTRACT_ADDRESS,
                                amount: parsedFirstFromAmount.toString(),
                                msg: JSON.stringify([
                                    "Deposit",
                                    {
                                        SwapExactIn: {
                                            token_in: firstFromTokenAddress,
                                            token_out: firstToTokenAddress,
                                            amount: parsedFirstFromAmount.toString(),
                                            amount_limit: parsedFirstToAmount
                                        }
                                    },
                                    {
                                        SwapExactIn: {
                                            token_in: firstToTokenAddress,
                                            token_out: secondToTokenAddress,
                                            amount: parsedSecondFromAmount.toString(),
                                            amount_limit: parsedSecondToAmount
                                        }
                                    },
                                    { Withdraw: [secondToTokenAddress, "0", null] }
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
        console.error("Error performing double swap:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
