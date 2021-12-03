require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, Key } = require('./models');

const encryptPassword = (password) => {
  return crypto.createHash('sha512').update(password).digest('base64');
};

const encryptSecretKey = (key) => {
  return crypto.createHash('sha512').update(key).digest('base64');
};

const setAuth = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const [bearer, token] = authorization.split(' ');
  if (bearer !== 'Bearer')
    return res.send({ error: 'Wrong Authorization' }).status(400);

  const { pub: publicKey } = jwt.decode(token);
  const key = await Key.findOne({ publicKey });
  if (!key) {
    return res.status(401).json({ error: 'no matched key' });
  }
  try {
    jwt.verify(token, key.secretKey);
  } catch (err) {
    return res.status(401).json({ error: 'invalid signature' });
  }
  const user = await User.findOne({ key });

  if (!user) return res.send({ error: 'Cannot find user' }).status(404);

  req.user = user;
  return next();
};

module.exports = {
  encryptPassword,
  encryptSecretKey,
  setAuth,
};
