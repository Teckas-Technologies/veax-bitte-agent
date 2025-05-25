const { providers } = require("near-api-js");
const VEAX_MAINNET_URL = 'https://rpc.mainnet.near.org/';

const viewMethod = async ({ contractId, method, args = {} }) => {
    const provider = new providers.JsonRpcProvider({ url: VEAX_MAINNET_URL });

    const res = await provider.query({
        request_type: 'call_function',
        account_id: contractId,
        method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
        finality: 'optimistic',
    });
    return JSON.parse(Buffer.from(res.result).toString());
};

module.exports = {
    viewMethod
}