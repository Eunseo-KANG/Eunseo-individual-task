const axios = require('axios').default;
const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Coin, Balance, Key } = require('./models');
const { encryptPassword, setAuth, encryptSecretKey } = require('./utils');

const app = express();

const port = process.env.PORT;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post(
  '/register',
  body('name').isLength({ min: 4, max: 12 }),
  body('email')
    .isLength({ max: 100 - 1 })
    .isEmail(),
  body('password').isLength({ min: 8, max: 16 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;
    const encryptedPassword = encryptPassword(password);
    let user = null;
    try {
      user = new User({
        name,
        email,
        password: encryptedPassword,
      });
      await user.save();
    } catch (err) {
      console.log(err);
      return res.send({ error: 'email is duplicated' }).status(400);
    }

    // 달러주기
    const usdBalance = new Balance({ name: 'usd', balance: 10000, user });
    await usdBalance.save();

    const coins = await Coin.find({ isActive: true });
    for (const coin of coins) {
      const balance = new Balance({ name: coin.name, balance: 0, user });
      await balance.save();
    }

    res.send({ _id: user._id });
  }
);

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const encryptedPassword = encryptPassword(password);
  const user = await User.findOne({ email, password: encryptedPassword });

  if (!user) {
    return res.send({ error: 'user not exists' }).status(404);
  }

  const publicKey = Math.random().toString(36).substring(2, 11);
  const secretKey = encryptSecretKey(
    Math.random().toString(36).substring(2, 11)
  );

  const key = new Key({ publicKey, secretKey });
  await key.save();
  user.key = key;
  await user.save();

  res.send({ publicKey, secretKey });
});

app.get('/balance', setAuth, async (req, res) => {
  const user = req.user;

  const balances = await Balance.find({ user });

  res.send(
    balances.reduce(
      (obj, balance) =>
        balance.balance ? { ...obj, [balance.name]: balance.balance } : obj,
      {}
    )
  );
});

app.get('/coins', async (req, res) => {
  const coins = await Coin.find({ isActive: true });
  res.send(coins.map((coin) => coin.name));
});

app.get('/coins/:coinName', async (req, res) => {
  const { coinName } = req.params;
  const coin = await Coin.findOne({ name: coinName });
  if (!coin) {
    return res.status(404).json({ errors: 'coin not found' });
  }
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinName}&vs_currencies=usd`;
  const apiRes = await axios.get(url);
  if (!Object.keys(apiRes.data).length) {
    return res.status(400).json({ error: 'cannot find coin' });
  }
  res.send({ price: apiRes.data[coinName].usd });
});

app.post(
  '/coins/:coinName/buy',
  setAuth,
  body('quantity')
    .if(body('all').not().exists())
    .notEmpty()
    .isNumeric()
    .custom((value) => {
      if (value < 0) {
        return false;
      }
      const decimal = `${value}`.split('.')[1];
      if (decimal && decimal.length > 4) {
        return false;
      }
      return true;
    }),
  body('all').if(body('quantity').not().exists()).notEmpty().isIn([true]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { coinName } = req.params;
    let { quantity, all } = req.body;
    const { user } = req;

    const coin = await Coin.findOne({ name: coinName });
    if (!coin) {
      return res.status(404).json({ error: 'coin not found' });
    }
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinName}&vs_currencies=usd`;
    const apiRes = await axios.get(url);
    const price = apiRes.data[coinName].usd;

    const usdBalance = await Balance.findOne({ user, name: 'usd' });
    if (all) {
      quantity = usdBalance.balance / price;
    }
    const amount = price * quantity;

    if (usdBalance.balance < amount) {
      return res.status(400).json({ error: 'balance not enough' });
    }
    usdBalance.balance = usdBalance.balance - amount;
    await usdBalance.save();

    const coinBalance = await Balance.findOne({ user, name: coinName });
    coinBalance.balance = coinBalance.balance + quantity;
    await coinBalance.save();

    return res.status(200).json({ price, quantity });
  }
);

app.post(
  '/coins/:coinName/sell',
  setAuth,
  body('quantity')
    .if(body('all').not().exists())
    .notEmpty()
    .isNumeric()
    .custom((value) => {
      if (value < 0) {
        return false;
      }
      const decimal = `${value}`.split('.')[1];
      if (decimal && decimal.length > 4) {
        return false;
      }
      return true;
    }),
  body('all').if(body('quantity').not().exists()).notEmpty().isIn([true]),
  async (req, res) => {
    const { coinName } = req.params;
    let { quantity, all } = req.body;
    const { user } = req;

    const coin = await Coin.findOne({ name: coinName });
    if (!coin) {
      return res.status(404).json({ error: 'coin not found' });
    }

    const coinBalance = await Balance.findOne({ user, name: coinName });
    if (all) {
      quantity = coinBalance.balance;
    }
    if (coinBalance.balance < quantity) {
      return res.status(400).json({ error: 'balance not enough' });
    }
    coinBalance.balance = coinBalance.balance - quantity;
    await coinBalance.save();

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinName}&vs_currencies=usd`;
    const apiRes = await axios.get(url);
    const price = apiRes.data[coinName].usd;
    const amount = price * quantity;

    const usdBalance = await Balance.findOne({ user, name: 'usd' });
    usdBalance.balance = usdBalance.balance + amount;
    await usdBalance.save();

    return res.status(200).json({ price, quantity });
  }
);

app.listen(port, () => {
  console.log(`listening at port: ${port}...`);
});
