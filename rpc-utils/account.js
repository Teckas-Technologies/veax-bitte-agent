const { VEAX_MAINNET_URL } = require("../utils/constants");

async function viewNearAccount(accountId) {

    const payload = {
        method: "query",
        params: {
            request_type: "view_account",
            finality: "final",
            account_id: accountId,
        },
        id: 2989,
        jsonrpc: "2.0"
    };

    try {
        const response = await fetch(VEAX_MAINNET_URL, {
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
        return result;
    } catch (error) {
        console.error('Error fetching NEAR account details:', error);
        return null;
    }
}

async function getFTBalance(tokenContractId, accountId) {

    const args = {
        account_id: accountId,
    };

    const payload = {
        jsonrpc: "2.0",
        id: 811,
        method: "query",
        params: {
            request_type: "call_function",
            account_id: tokenContractId,
            method_name: "ft_balance_of",
            args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
            finality: "optimistic",
        },
    };

    try {
        const response = await fetch(VEAX_MAINNET_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const { result } = await response.json();

        const decoded = Buffer.from(result.result).toString('utf-8');
        const balanceRaw = JSON.parse(decoded); // this removes the quotes

        return balanceRaw

    } catch (error) {
        console.error(`Error fetching FT balance for ${tokenContractId}:`, error);
        return null;
    }
}

module.exports = {
    viewNearAccount,
    getFTBalance
}


// Example usage:
// viewNearAccount('golden_comet.near').then(data => console.log(data));
