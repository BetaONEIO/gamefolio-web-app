const { scrypt, randomBytes, timingSafeEqual } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  try {
    const newPassword = 'Helloworld1!';
    const hashedPassword = await hashPassword(newPassword);
    console.log('New hashed password:', hashedPassword);
    console.log('Length:', hashedPassword.length);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();