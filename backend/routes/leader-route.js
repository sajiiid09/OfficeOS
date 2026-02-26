const router = require('express').Router();
const asyncMiddleware = require('../middlewares/async-middleware');
const userController = require('../controllers/user-controller');
const leaderController = require('../controllers/leader-controller');
const progressController = require('../controllers/progress-controller');
const upload = require('../middlewares/multer-config');
const { auth } = require('../middlewares/auth-middleware');

router.use(auth);

router.patch('/user', upload.single('image'), asyncMiddleware(userController.updateUser));
router.get('/team', asyncMiddleware(leaderController.getTeam));
router.get('/team/members', asyncMiddleware(leaderController.getTeamMembers));
router.get('/stats', asyncMiddleware(leaderController.getDashboardStats));
router.get('/leaderboard', asyncMiddleware(leaderController.getLeaderboard));

router.patch('/team/progress', asyncMiddleware(leaderController.updateTeamProgress));

router.post('/progress', asyncMiddleware(progressController.submitSelfProgress));
router.get('/progress', asyncMiddleware(progressController.getSelfProgress));

router.patch('/progress/member/:id', asyncMiddleware(leaderController.updateMemberProgress));

router.get('/attendance-summary', asyncMiddleware(userController.getAttendanceSummary));

module.exports = router;
