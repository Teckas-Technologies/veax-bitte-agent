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
// const doubleSwapRouter = require('./routes/doubleSwap');
const positionRouter = require('./routes/liquidityPosition');
const balanceRouter = require('./routes/balance');


app.use('/api/tokens', tokenRouter);
app.use('/api/pools', poolRouter);
app.use('/api/add-liquidity', addLiquidityRouter);
app.use('/api/swap', swapRouter);
// app.use('/api/double-swap', doubleSwapRouter);
app.use('/api/positions', positionRouter);
app.use('/api/balance', balanceRouter);


app.get("/", (req, res) => res.send("Express on Azure"));
app.get('/.well-known/ai-plugin.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, 'public/.well-known/ai-plugin.json'));
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Veax AI Agent Running on port : ${port}`)
})