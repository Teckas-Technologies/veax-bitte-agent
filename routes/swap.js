const express = require("express");
const router = express.Router();
const { fetchTokenDecimals, parseTokenAmount } = require("../utils/utils");
const { estimateSwapExactIn } = require("../utils/swapUtils");
const { getAllTokenMetadata } = require("../rpc-utils/token");
const { getFTBalance } = require("../rpc-utils/account");

const VEAX_CONTRACT_ADDRESS = "veax.near";

router.get("/", async (req, res) => {
    try {
        const { fromTokenSymbol, toTokenSymbol, walletAddress, amount, slippage } = req.query;

        if (!fromTokenSymbol || !toTokenSymbol || !walletAddress || !amount) {
            return res.status(400).json({ error: "fromTokenSymbol, toTokenSymbol, walletAddress and amount are required" });
        }

        const tokens = await getAllTokenMetadata() || [];

        console.log("Tokens: ", tokens);

        // Find tokens by symbol
        const tokenAData = tokens.find(token => token.symbol?.toLowerCase() === fromTokenSymbol.toLowerCase());
        const tokenBData = tokens.find(token => token.symbol?.toLowerCase() === toTokenSymbol.toLowerCase());

        // Validate existence
        if (!tokenAData || !tokenBData) {
            return res.status(400).json({
                error: `Could not find tokens for symbols: ${!tokenAData ? fromTokenSymbol : ''} ${!tokenBData ? toTokenSymbol : ''}`
            });
        }

        const fromTokenAddress = tokenAData.sc_address;
        const toTokenAddress = tokenBData.sc_address;

        console.log("Token A Address:", fromTokenAddress);
        console.log("Token B Address:", toTokenAddress);

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

        const estimation = await estimateSwapExactIn(fromTokenAddress, toTokenAddress, amount, customSlippage);

        console.log("Estimation: ", estimation);

        if (!estimation) {
            return res.status(400).json({ error: "Swap estimation has been failed" });
        }

        const tokenAAmount = parseFloat(amount);
        const tokenBAmount = estimation?.data?.result?.amount_b_expected;

        // Convert to Yocto format
        const parsedFromTokenAmount = parseTokenAmount(tokenAAmount, decimalsA);
        const parsedToTokenAmount = parseTokenAmount(tokenBAmount, decimalsB);

        const maxAmountBigInt = BigInt(parsedFromTokenAmount);
        const balance = BigInt(await getFTBalance(fromTokenAddress, walletAddress));

        if (balance < maxAmountBigInt) {
            return res.status(400).json({
                error: `Insufficient balance for Token A (${tokenAData?.symbol}). Required: ${maxAmountBigInt}, Available: ${balance}, Decimal: ${tokenAData?.decimals}`
            });
        }

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