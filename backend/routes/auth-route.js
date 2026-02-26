const router = require('express').Router();
const authController = require('../controllers/auth-controller');
const { auth } = require('../middlewares/auth-middleware');
const upload = require('../middlewares/multer-config');

router.post('/login', authController.login);
router.post('/forgot', authController.forgotPassword);
router.patch('/reset', authController.resetPassword);
router.get('/logout', auth, authController.logout);
router.get('/refresh', authController.refreshToken);
router.post('/register-invited', upload.single('image'), authController.registerInvited);

module.exports = router;

