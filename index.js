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

app.use('/api/tokens', tokenRouter);
app.use('/api/pools', poolRouter);
app.use('/api/add-liquidity', addLiquidityRouter);

app.get("/", (req, res) => res.send("Express on Azure"));
app.get('/.well-known/ai-plugin.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, 'public/.well-known/ai-plugin.json'));
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Veax AI Agent Running on port : ${port}`)
})