import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

// Define custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create the logger instance
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // Capture stack traces
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'saksham-backend' },
  transports: [
    // Standard console output for Docker/Systemd
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }), // Add color for readability in terminal
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    })
  ]
});

// Create a stream object for Morgan integration
export const stream = {
  write: (message) => {
    // Morgan outputs end with a newline, trim it
    logger.info(message.trim());
  }
};
