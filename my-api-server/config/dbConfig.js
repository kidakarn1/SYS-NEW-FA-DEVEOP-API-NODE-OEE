require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    connectionTimeout: 60000, // 30 seconds
    requestTimeout: 60000 // 30 seconds
};
module.exports = dbConfig;