const { viewMethod } = require("../contract-utils/view");

const { format } = require("near-api-js").utils;

const GAS_FOR_WRAP = '30000000000000';
const ACCOUNT_CREATION_COSTS = "0.042";
const WRAP_NEAR_CONTRACT_ID = "wrap.near";

async function wrap(walletAddress, amount) {
    if (!walletAddress || !amount) {
        return { succes: false, message: "walletAddress and amount are required" }
    }

    const actions = [{
        method: "near_deposit",
        args: {},
        gas: GAS_FOR_WRAP,
        deposit: format.parseNearAmount(amount),
    }];

    const storage = await viewMethod({
        contractId: WRAP_NEAR_CONTRACT_ID,
        method: 'storage_balance_of',
        args: { account_id: walletAddress },
    });

    console.log("RES:", storage)

    if (!storage) {
        actions.unshift({
            method: 'storage_deposit',
            args: {},
            gas: GAS_FOR_WRAP,
            deposit: format.parseNearAmount(ACCOUNT_CREATION_COSTS),
        });
    }

    const transactions = [{
        receiverId: WRAP_NEAR_CONTRACT_ID,
        actions: actions.map(({ method, args, gas, deposit }) => ({
            type: "FunctionCall",
            params: {
                methodName: method,
                args,
                gas,
                deposit,
            },
        })),
    }];

    return { succes: true, transactions: transactions }
}

async function unWrap(amount) {
    if (!amount) {
        return { succes: false, message: "amount is required" }
    }

    const actions = [{
        method: 'near_withdraw',
        args: { amount: format.parseNearAmount(amount) },
        gas: GAS_FOR_WRAP,
        deposit: "1",
    }];

    const transactions = [{
        receiverId: WRAP_NEAR_CONTRACT_ID,
        actions: actions.map(({ method, args, gas, deposit }) => ({
            type: "FunctionCall",
            params: {
                methodName: method,
                args,
                gas,
                deposit,
            },
        }))
    }]

    return { succes: true, transactions: transactions }
}

module.exports = {
    wrap,
    unWrap
}

