const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use('public', express.static(path.join(__dirname, 'public')));

const cors = require('cors');
// app.use(cors({ origin: 'http://localhost:3000' }));
app.use(cors({ origin: '*' }));

const tokenRouter = require('./routes/tokens');
const poolRouter = require('./routes/pools');
const addLiquidityRouter = require('./routes/addLiquidity');
const swapRouter = require('./routes/swap');
const positionRouter = require('./routes/liquidityPosition');

// const addLiquidityRouterNew = require('./routes/addLiquidityNew');
// const { fetchTickAndAmountRanges, fetchMarketPrice, fetchHighLiquidityFeeLevel } = require('./utils/utils');
// const { calculateMinMaxAmounts, calculateTickRanges } = require('./utils/testUtils');

// fetchTickAndAmountRanges("wrap.near", "usdt.tether-token.near", "1", "2.8")
// Example usage
// calculateMinMaxAmounts("17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1", "wrap.near", 1).then(console.log);
// const priceToTick = (price) => Math.round(Math.log(price) / Math.log(1.0001));

// const test = async () => {
//     // const fee = await fetchHighLiquidityFeeLevel("wrap.near", "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1")
//     // console.log("Fee",fee)
//     await calculateTickRanges();
// }
// test();

// console.log(priceToTick("0.37653946507933567"))

// fetchMarketPrice("wrap.near", "usdt.tether-token.near")


app.use('/api/tokens', tokenRouter);
app.use('/api/pools', poolRouter);
app.use('/api/add-liquidity', addLiquidityRouter);
app.use('/api/swap', swapRouter);
app.use('/api/positions', positionRouter);

// app.use('/api/add-liquidity-new', addLiquidityRouterNew);

app.get("/", (req, res) => res.send("Express on Azure"));
app.get('/.well-known/ai-plugin.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, 'public/.well-known/ai-plugin.json'));
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Veax AI Agent Running on port : ${port}`)
})