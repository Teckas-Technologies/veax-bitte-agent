const { FULL_RANGE_MIN_VALUE, FULL_RANGE_MAX_VALUE, MIN_TICK, MAX_TICK } = require("../constants/liquidity");
const { formatOnePrice, userToNativePrice, priceToTickNew, ratioToMaxPrice, nativeToUserPrice, ratioToMinPrice } = require("../helpers/calculations");

async function formatSlippage(slippage) {
    // 0.02 = 2% | 0.01 = 1% | 0.005 = 0.5% | 0.001 = 0.1% Slippage

    let slippageTolerance = 0.005;

    if (slippage === "0.1") {
        slippageTolerance = 0.001
    } else if (slippage === "2") {
        slippageTolerance = 0.02
    } else if (slippage === "1") {
        slippageTolerance = 0.01
    } else {
        slippageTolerance = 0.005
    }

    console.log(slippageTolerance)

    return slippageTolerance;
}

async function calculateEqualTicks({ aDecimals, bDecimals, price: priceRaw, leverage }) {
    const amountRatio = 1;
    const price = formatOnePrice(priceRaw);
    const nativePrice = userToNativePrice(price, Number(aDecimals), Number(bDecimals));
    const priceTick = priceToTickNew(nativePrice);
    const maxPrice = ratioToMaxPrice(nativePrice, amountRatio, leverage);
    const maxTick = priceToTickNew(maxPrice);
    const maxFormat = nativeToUserPrice(maxPrice, Number(aDecimals), Number(bDecimals)).toString();
    const minPrice = ratioToMinPrice(maxPrice || 1, leverage);
    const minTick = priceToTickNew(minPrice);
    const minFormat = nativeToUserPrice(minPrice, Number(aDecimals), Number(bDecimals)).toString();

    if (leverage === 1 || maxTick > MAX_TICK || minTick < MIN_TICK) {
        return {
            minPrice: FULL_RANGE_MIN_VALUE,
            maxPrice: FULL_RANGE_MAX_VALUE,
            minFormat: FULL_RANGE_MIN_VALUE,
            maxFormat: FULL_RANGE_MAX_VALUE,
            minTick: MIN_TICK,
            maxTick: MAX_TICK,
            priceTick,
        };
    }

    return {
        minTick,
        maxTick,
        minPrice,
        maxPrice,
        minFormat,
        maxFormat,
        priceTick,
    };
}

module.exports = {
    formatSlippage,
    calculateEqualTicks
}