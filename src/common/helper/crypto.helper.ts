import * as CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.CRYPTO_SECRET_KEY || 'default-secret-key';

export const encodeValue = (value: any): string =>
  CryptoJS.AES.encrypt(JSON.stringify(value), SECRET_KEY).toString();

export const decodeValue = (value: string): any => {
  const key = SECRET_KEY;
  try {
    const bytes = CryptoJS.AES.decrypt(value, key);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString || decryptedString.length === 0) {
      throw new Error('Decryption resulted in empty string');
    }
    
    return JSON.parse(decryptedString);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};
