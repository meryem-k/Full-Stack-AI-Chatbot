const db = require('./db');

const getProductInfo = async (productName) => {
  try {
    console.log(`Fetching info for product: ${productName}`);
    const result = await db.query('SELECT * FROM products WHERE name ILIKE $1', [productName]);
    if (result.rows.length > 0) {
      console.log(`Product found: ${JSON.stringify(result.rows[0])}`);
      return result.rows[0];
    } else {
      console.log('Product not found');
      return null;
    }
  } catch (err) {
    console.error('Error fetching product info:', err.stack);
    return null;
  }
};

module.exports = { getProductInfo };
