module.exports = {
  development: {
    postgres: {
      username: process.env.COMPANY_DB_USER,
      password: process.env.COMPANY_DB_PASS,
      database: process.env.COMPANY_DB_NAME,
      host: process.env.COMPANY_DB_HOST,
      port: process.env.COMPANY_DB_PORT,
      dialect: "postgres",
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    },
  },
  stage: {
    postgres: {
      dialect: "postgres",
      host: process.env.COMPANY_DB_HOST,
      port: process.env.COMPANY_DB_PORT,
      username: process.env.COMPANY_DB_USER,
      password: process.env.COMPANY_DB_PASS,
      database: process.env.COMPANY_DB_NAME,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    },
  },
  production: {
    postgres: {
      username: process.env.COMPANY_DB_USER,
      password: process.env.COMPANY_DB_PASS,
      database: process.env.COMPANY_DB_NAME,
      host: process.env.COMPANY_DB_HOST,
      port: process.env.COMPANY_DB_PORT,
      dialect: "postgres",
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Allows RDS self-signed cert
        },
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    },
  },
};
