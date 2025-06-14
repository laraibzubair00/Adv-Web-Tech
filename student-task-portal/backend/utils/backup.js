const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { logger } = require('../middleware/logger');

// Create backup directory if it doesn't exist
const backupDir = path.join(__dirname, '../../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Database backup
const backupDatabase = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `db-backup-${timestamp}`);
  const dumpPath = `${backupPath}.gz`;

  return new Promise((resolve, reject) => {
    const command = `mongodump --uri="${process.env.MONGODB_URI}" --archive="${dumpPath}" --gzip`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error('Database backup failed:', error);
        reject(error);
        return;
      }

      logger.info('Database backup completed:', dumpPath);
      resolve(dumpPath);
    });
  });
};

// File backup
const backupFiles = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `files-backup-${timestamp}.zip`);
  const output = fs.createWriteStream(backupPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      logger.info('File backup completed:', backupPath);
      resolve(backupPath);
    });

    archive.on('error', (err) => {
      logger.error('File backup failed:', err);
      reject(err);
    });

    archive.pipe(output);

    // Add uploads directory
    archive.directory('uploads/', 'uploads');

    // Add logs directory
    archive.directory('logs/', 'logs');

    archive.finalize();
  });
};

// Restore database
const restoreDatabase = async (backupPath) => {
  return new Promise((resolve, reject) => {
    const command = `mongorestore --uri="${process.env.MONGODB_URI}" --archive="${backupPath}" --gzip`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error('Database restore failed:', error);
        reject(error);
        return;
      }

      logger.info('Database restore completed');
      resolve();
    });
  });
};

// Restore files
const restoreFiles = async (backupPath) => {
  return new Promise((resolve, reject) => {
    const extract = require('extract-zip');

    extract(backupPath, { dir: process.cwd() })
      .then(() => {
        logger.info('File restore completed');
        resolve();
      })
      .catch((err) => {
        logger.error('File restore failed:', err);
        reject(err);
      });
  });
};

// Cleanup old backups
const cleanupBackups = async (maxAge = 30) => { // Default: 30 days
  const files = fs.readdirSync(backupDir);
  const now = new Date();

  for (const file of files) {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const age = (now - stats.mtime) / (1000 * 60 * 60 * 24); // Age in days

    if (age > maxAge) {
      fs.unlinkSync(filePath);
      logger.info('Deleted old backup:', file);
    }
  }
};

// Schedule regular backups
const scheduleBackups = () => {
  // Daily database backup at 2 AM
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 2 && now.getMinutes() === 0) {
      try {
        await backupDatabase();
        await cleanupBackups();
      } catch (error) {
        logger.error('Scheduled backup failed:', error);
      }
    }
  }, 60000); // Check every minute

  // Weekly file backup on Sunday at 3 AM
  setInterval(async () => {
    const now = new Date();
    if (now.getDay() === 0 && now.getHours() === 3 && now.getMinutes() === 0) {
      try {
        await backupFiles();
      } catch (error) {
        logger.error('Scheduled file backup failed:', error);
      }
    }
  }, 60000); // Check every minute
};

module.exports = {
  backupDatabase,
  backupFiles,
  restoreDatabase,
  restoreFiles,
  cleanupBackups,
  scheduleBackups
}; 