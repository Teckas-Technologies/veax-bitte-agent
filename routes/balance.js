const express = require("express");
const router = express.Router();
const axios = require("axios");
const { viewNearAccount, getFTBalance } = require("../rpc-utils/account");
const { formatTokenAmount } = require("../utils/utils");
const { getAllTokenMetadata } = require("../rpc-utils/token");

router.get("/", async (req, res) => {
    try {
        const { tokenSymbol, walletAddress } = req.query;

        if (!tokenSymbol || !walletAddress) {
            return res.status(400).json({ error: "tokenSymbol and walletAddress are required" });
        }

        if (tokenSymbol.toLowerCase() === "near") {
            const response = await viewNearAccount(walletAddress);
            const balance = response?.result?.amount;
            const formattedBalance = formatTokenAmount(balance, 24);
            return res.status(200).json({ balance: formattedBalance });
        }

        const tokens = await getAllTokenMetadata() || [];

        const tokenData = tokens.find(token => token.symbol?.toLowerCase() === tokenSymbol.toLowerCase());

        if (!tokenData) {
            return res.status(400).json({
                error: `Could not find token for symbol: ${tokenSymbol}`
            });
        }

        const tokenAddress = tokenData.sc_address;

        const tokenBalance = await getFTBalance(tokenAddress, walletAddress);

        const formattedTokenBalance = formatTokenAmount(tokenBalance, tokenData?.decimals);
        return res.status(200).json({ balance: formattedTokenBalance });

    } catch (error) {
        console.error("Error fetching liquidity paired tokens:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;