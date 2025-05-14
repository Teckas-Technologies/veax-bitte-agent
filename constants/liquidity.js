const CHECK_VALUE = '1.1';
const VALUE_FOR_ONE = 1.0000001;
const VALUE_FOR_ONE_BELOW = 0.9999999;

const MIN_TO_MAX_MULTIPLIER = 4;
const MIN_TICK = -887_273;
const MAX_TICK = 887_273;

const FULL_RANGE_MIN_VALUE = '0';
const FULL_RANGE_MAX_VALUE = '∞';

const FEE_LEVELS = [
    0.01,
    0.02,
    0.04,
    0.08,
    0.16,
    0.32,
    0.64,
    1.28,
];

module.exports = {
    CHECK_VALUE,
    VALUE_FOR_ONE,
    VALUE_FOR_ONE_BELOW,
    MIN_TO_MAX_MULTIPLIER,
    MIN_TICK,
    MAX_TICK,
    FULL_RANGE_MAX_VALUE,
    FULL_RANGE_MIN_VALUE,
    FEE_LEVELS
}