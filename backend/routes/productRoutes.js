const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.post('/product-information', productController.initialProductInformationRequest);
router.post('/product-information-followup', productController.followUpProductInformationRequest);

module.exports = router;
