module.exports = (req) => {
  throw new Error(req.params.msg || 'TEST error');
};
