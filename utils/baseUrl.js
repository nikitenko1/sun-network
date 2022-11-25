const baseUrl =
  process.env.NODE_ENV !== 'production'
    ? 'http://localhost:3000'
    : 'https://---app.vercel.app';

module.exports = baseUrl;
