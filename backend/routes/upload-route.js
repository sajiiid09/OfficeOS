const router = require('express').Router();
const upload = require('../middlewares/multer-config');
const { auth } = require('../middlewares/auth-middleware');

router.post('/', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded or wrong field name' });
  res.json({ success: true, message: 'Image uploaded successfully', filename: req.file.filename, path: req.file.path });
});

module.exports = router;
