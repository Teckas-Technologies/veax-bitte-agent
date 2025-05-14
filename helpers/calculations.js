const { VALUE_FOR_ONE_BELOW, VALUE_FOR_ONE } = require("../constants/liquidity");

const formatOnePrice = (price, pickBelow = false) =>
(Number(price) === 1
    ? pickBelow
        ? VALUE_FOR_ONE_BELOW
        : VALUE_FOR_ONE
    : Number(price));

const mathLog = (n, base) => Math.log(n) / (base ? Math.log(base) : 1);

// nativePrice <-> userPrice
const nativeToUserPrice = (nativePrice, decimalsA, decimalsB) => nativePrice * (10 ** (decimalsA - decimalsB));
const userToNativePrice = (userPrice, decimalsA, decimalsB) => userPrice * (10 ** (decimalsB - decimalsA));

const priceToTickNew = (price) => Math.round(mathLog(price, 1.0001));
const priceToTickFloor = (price) => Math.floor(mathLog(price, 1.0001));
const priceToTickCeil = (price) => Math.ceil(mathLog(price, 1.0001));

const ratioToMaxPrice = (price, ratio, leverage) =>
    (4 * price) / (Math.sqrt((1 - ratio) ** 2 + 4 * ratio * ((1 - 1 / leverage) ** 2)) + 1 - ratio) ** 2;

const ratioToMinPrice = (maxPrice, leverage) =>
    maxPrice * ((1 - 1 / leverage) ** 4);


module.exports = {
    formatOnePrice,
    nativeToUserPrice,
    userToNativePrice,
    priceToTickNew,
    priceToTickFloor,
    priceToTickCeil,
    ratioToMinPrice,
    ratioToMaxPrice
}
