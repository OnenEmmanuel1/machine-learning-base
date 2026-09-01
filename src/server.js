const http = require('http');
const app = require('./app');
const { initDatabase, queryOne } = require('./config/database');
const { seedDatabase } = require('../database/seed');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('[BOOTSTRAP] Connecting to MySQL Database...');
    await initDatabase();

    // Check if database has users or models seeded
    const userCheck = await queryOne('SELECT COUNT(*) as count FROM users');
    const modelCheck = await queryOne('SELECT COUNT(*) as count FROM prediction_models');

    if (!userCheck || userCheck.count === 0 || !modelCheck || modelCheck.count === 0) {
      console.log('[BOOTSTRAP] Database is unseeded. Running initial seed & model training pipeline...');
      await seedDatabase();
    } else {
      console.log(`[BOOTSTRAP] Database verified. Active models: ${modelCheck.count}, Users: ${userCheck.count}.`);
    }

    const server = http.createServer(app);

    let currentPort = parseInt(PORT, 10);
    let attempts = 0;
    const maxAttempts = 10;

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
        attempts++;
        console.warn(`[PORT NOTICE] Port ${currentPort} is in use by another service. Trying port ${currentPort + 1}...`);
        currentPort++;
        setTimeout(() => {
          server.close();
          server.listen(currentPort);
        }, 150);
      } else {
        console.error('[FATAL SERVER ERROR]:', err);
        process.exit(1);
      }
    });

    server.on('listening', () => {
      const address = server.address();
      const actualPort = typeof address === 'string' ? address : address.port;
      console.log('================================================================');
      console.log(` ML-SPMS — University of Calabar CS Department`);
      console.log(` Application running live at: http://localhost:${actualPort}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('================================================================');
      console.log(' Demo Login Accounts (All passwords: password123):');
      console.log('  - Administrator : admin@unical-cs.edu.ng    / password123');
      console.log('  - Lecturer      : lecturer@unical-cs.edu.ng / password123');
      console.log('  - High Risk Stu : CSC/2021/041              / password123');
      console.log('  - Mod Risk Stu  : CSC/2021/018              / password123');
      console.log('  - Low Risk Stu  : CSC/2021/005              / password123');
      console.log('================================================================');
    });

    server.listen(currentPort);
  } catch (error) {
    console.error('[FATAL SERVER START ERROR]:', error);
    process.exit(1);
  }
}

startServer();
