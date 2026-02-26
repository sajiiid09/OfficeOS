const userService = require('../services/user-service');
const teamService = require('../services/team-service');
const ErrorHandler = require('../utils/error-handler');
const UserDto = require('../dtos/user-dto');
const TeamDto = require('../dtos/team-dto');
const progressService = require('../services/progress-service');
const mongoose = require('mongoose');

class LeaderController {

    getTeamMembers = async (req, res, next) => {
        try {
            const team = await teamService.findTeam({ leader: req.user._id });
            if (!team) return res.json({ success: true, message: 'No team assigned', data: [] });

            const members = await userService.findUsers({ team: team._id });
            if (!members?.length) return res.json({ success: true, message: 'No members found', data: [] });

            res.json({ success: true, message: 'Members Found', data: members.map(m => new UserDto(m)) });
        } catch (error) {
            next(error);
        }
    }

    // Leaderboard endpoint used by frontend
    getLeaderboard = async (req, res, next) => {
        try {
            const mode = (req.query.mode || 'users').toLowerCase();
            const typeFilter = req.query.type || null; // e.g., 'employee' or 'leader'

            // get recent progress entries
            const allProgress = await progressService.getAll(1000);

            // pick latest per user (progressService.getAll sorts by date desc)
            const latestByUser = new Map();
            for (const p of allProgress) {
                if (!p.user) continue;
                const uid = p.user._id.toString();
                if (!latestByUser.has(uid)) latestByUser.set(uid, p);
            }

            const userIds = Array.from(latestByUser.keys());
            const users = userIds.length ? await userService.findUsers({ _id: { $in: userIds } }) : [];
            const userMap = new Map(users.map(u => [u._id.toString(), u]));

            if (mode === 'teams') {
                const teamMap = new Map();
                for (const [uid, prog] of latestByUser.entries()) {
                    const user = userMap.get(uid);
                    if (!user || !user.team) continue; // skip users without team

                    // user.team can be a populated object or an array of teams
                    const userTeams = Array.isArray(user.team) ? user.team : [user.team];

                    userTeams.forEach((teamItem) => {
                        if (!teamItem) return;
                        const teamId = (teamItem._id || teamItem.id || teamItem).toString();
                        const teamName = typeof teamItem.name === 'string' && teamItem.name.trim()
                            ? teamItem.name
                            : 'Team';

                        if (!teamMap.has(teamId)) {
                            teamMap.set(teamId, { id: teamId, name: teamName, total: 0, count: 0 });
                        }

                        const entry = teamMap.get(teamId);
                        entry.total += (prog.progress || 0);
                        entry.count += 1;
                    });
                }

                const result = Array.from(teamMap.values()).map(t => ({ id: t.id, name: t.name, progress: Math.round(t.total / t.count) || 0 }));
                return res.json({ success: true, data: result });
            }

            // Default: users leaderboard
            const result = [];
            for (const [uid, prog] of latestByUser.entries()) {
                const user = userMap.get(uid);
                if (typeFilter && user && user.type !== typeFilter) continue;
                result.push({
                    id: uid,
                    name: user ? (user.name || user.username) : (prog.user.name || 'Unknown'),
                    image: user ? user.image : prog.user.image,
                    type: user ? user.type : prog.user.type,
                    team: user ? user.team : prog.user.team,
                    progress: prog.progress || 0
                });
            }

            return res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    getTeam = async (req, res, next) => {
        try {
            const team = await teamService.findTeam({ leader: req.user._id });
            if (!team) return res.json({ success: true, message: 'No team assigned', data: null });
            res.json({ success: true, message: 'Team Found', data: new TeamDto(team) });
        } catch (error) {
            next(error);
        }
    }

    getDashboardStats = async (req, res, next) => {
        try {
            const team = await teamService.findTeam({ leader: req.user._id });
            if (!team) {
                return res.json({
                    success: true,
                    data: { totalMembers: 0, totalProblems: 0 }
                });
            }

            const members = await userService.findUsers({ team: team._id });
            const [membersCount, problemsCount] = await Promise.all([
                userService.findCount({ team: team._id }),
                mongoose.model('Problem').countDocuments({
                    user: { $in: members.map(m => m._id) }
                })
            ]);

            res.json({
                success: true,
                data: { totalMembers: membersCount, totalProblems: problemsCount }
            });
        } catch (error) {
            next(error);
        }
    }

    updateTeamProgress = async (req, res, next) => {
        try {
            const { progress, progressNote } = req.body;
            const team = await teamService.findTeam({ leader: req.user._id });
            if (!team) return next(ErrorHandler.notFound('You are not leading any team'));

            const p = Number(progress);
            if (progress === undefined || progress === null) {
                return next(ErrorHandler.badRequest('Progress value is required'));
            }
            if (Number.isNaN(p) || p < 0 || p > 100) {
                return next(ErrorHandler.badRequest('Progress must be between 0 and 100'));
            }

            const update = { progress: p };
            if (typeof progressNote === 'string') update.progressNote = progressNote;

            const result = await teamService.updateTeam(team._id, update);
            if (result.modifiedCount !== 1) {
                return next(ErrorHandler.serverError('Failed to update team progress'));
            }
            res.json({ success: true, message: 'Team progress updated' });
        } catch (error) {
            next(error);
        }
    }

    updateMemberProgress = async (req, res, next) => {
        try {
            const { id } = req.params;
            const team = await teamService.findTeam({ leader: req.user._id });
            if (!team) return next(ErrorHandler.notFound('You are not leading any team'));

            const member = await userService.findUser({ _id: id });
            if (!member || !member.team?.some(t => t.toString() === team._id.toString())) {
                return next(ErrorHandler.forbidden('You can only update progress for your own team members'));
            }

            // Delegate to userController's updateUserProgress
            const userController = require('./user-controller');
            return userController.updateUserProgress(req, res, next);
        } catch (error) {
            next(error);
        }
    }

}

module.exports = new LeaderController();
