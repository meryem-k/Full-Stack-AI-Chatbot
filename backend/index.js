const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const productRoutes = require('./routes/productRoutes');
const ticketRoutes = require('./routes/ticketRoutes');


const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

app.use('/api', productRoutes);
app.use('/api', ticketRoutes);


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
