const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json'); // หรือ swagger.yaml ตามที่สร้างไฟล์ไว้

const app = express();
// Middleware สำหรับ Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const port = 3000;
const dataRoutes = require('./routes/dataRoutes');

app.use('/api', dataRoutes);

app.listen(port, () => {
    console.log(`API server is running on http://localhost:${port}`);
});