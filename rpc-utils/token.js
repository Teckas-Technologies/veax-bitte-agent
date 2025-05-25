const VEAX_POOL_RPC_URL = 'https://veax-liquidity-pool.veax.com/v1/rpc';

async function getTokenCurrentPrices(tokenAddresses) {

    const payload = {
        jsonrpc: "2.0",
        method: "token_current_prices",
        params: {
            token_addresses: tokenAddresses,
        },
        id: 0,
    };

    try {
        const response = await fetch(VEAX_POOL_RPC_URL, {
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
        return result.result;
    } catch (error) {
        console.error('Error fetching token current prices:', error);
        return null;
    }
}

async function getTokensList({
    page = 1,
    limit = 100,
    sort = "NONE",
    isDesc = false,
    search = ""
} = {}) {
    const url = 'https://veax-liquidity-pool.veax.com/v1/rpc/';

    const payload = {
        jsonrpc: "2.0",
        id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        method: "tokens_list",
        params: {
            filter: {
                page,
                limit,
                sort,
                is_desc: isDesc,
                search,
            }
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        return result.result;
    } catch (error) {
        console.error('Error fetching tokens list:', error);
        return null;
    }
}

async function getFTMetadata(tokenId) {
    const url = 'https://rpc.mainnet.near.org';

    const payload = {
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
    };

    try {
        const response = await fetch(url, {
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

        // Parse the base64-encoded result into a usable object
        if (!result || !Array.isArray(result.result)) {
            throw new Error(`Invalid FT metadata result for token ${tokenId}`);
        }

        const metadataRaw = Buffer.from(result.result).toString('utf-8');

        return JSON.parse(metadataRaw);
    } catch (error) {
        console.error('Error fetching FT metadata:', error);
        return null;
    }
}

async function getAllTokenMetadata() {
    const response = await getTokensList();
    const tokens = response?.tokens || [];

    const metadataList = await Promise.all(
        tokens.map(async (token) => {
            const scAddress = token?.sc_address;
            if (!scAddress || scAddress === "aurora") {
                console.warn("Missing sc_address for token:", token);
                return null;
            }

            try {
                const metadata = await getFTMetadata(scAddress);
                if (!metadata || typeof metadata !== "object") {
                    console.warn("No metadata returned for:", scAddress);
                    return null;
                }

                const { icon, ...metadataWithoutIcon } = metadata;

                return {
                    ...metadataWithoutIcon,
                    sc_address: scAddress,
                };
            } catch (err) {
                console.error(`Failed to fetch metadata for ${scAddress}`, err);
                return null;
            }
        })
    );

    return metadataList.filter(Boolean);
}


module.exports = {
    getAllTokenMetadata,
    getTokenCurrentPrices
}

// Example usage
// getAllTokenMetadata().then((allMetadata) => {
//   console.log("All token metadata with sc_address:", allMetadata);
// });

// Example usage:
// getFTMetadata("wrap.near").then(metadata => console.log(metadata));

// Example usage:
// getTokensList().then(tokens => console.log(tokens));

// Example usage:
// getTokenCurrentPrices([
//   '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
//   'wrap.near'
// ]).then(data => console.log(data));
