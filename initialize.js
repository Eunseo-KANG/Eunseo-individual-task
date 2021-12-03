const { User, Coin, Balance, Key } = require('./models');

const init = async () => {
  await User.deleteMany();
  await Balance.deleteMany();
  await Coin.deleteMany();
  await Key.deleteMany();
  const coins = [
    'bitcoin',
    'ripple',
    'ethereum',
    'dogecoin',
    'bitcoin-gold',
    'bitcoin-green',
  ];

  for (const _coin of coins) {
    const coin = new Coin({ name: _coin, isActive: true });
    await coin.save();
  }

  console.log('completed');
};
init();
