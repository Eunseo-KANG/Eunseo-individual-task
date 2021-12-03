const jwt = require('jsonwebtoken');

const publicKey = '8qp2l5jcw';
const secretKey =
  '8vhr8qmeTma1XdnRvNrbrOtkOz7EgO0MKVLxqKdJ1wP5IGNnID7QogND1PtT7WHeW0Rwx6eVNxPjK8Sj+Saxyw==';

const token = jwt.sign({ pub: publicKey }, secretKey, {
  expiresIn: 1000 * 60 * 5,
});

console.log(token);
