export default () => ({
  port: process.env.PORT,
  database: {
    url: process.env.DB_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
})
