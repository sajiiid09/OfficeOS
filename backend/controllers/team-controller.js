const teamService = require('../services/team-service');
const ErrorHandler = require('../utils/error-handler');
const TeamDto = require('../dtos/team-dto');
const userService = require('../services/user-service');
const mongoose = require('mongoose');
const UserDto = require('../dtos/user-dto');
const fileService = require('../services/file-service');
const InvitationModel = require('../models/invitation-model');
const ProgressModel = require('../models/progress-model');
const EmployerModel = require('../models/employer-model');

class TeamController {

    createTeam = async (req, res, next) => {
        try {
            const { name, description } = req.body;
            if (!name) return next(ErrorHandler.badRequest('Team name is required'));

            const team = await teamService.createTeam({
                name, description,
                image: req.file?.path
            });
            if (!team) return next(ErrorHandler.serverError('Failed To Create The Team'));

            res.json({ success: true, message: 'Team Has Been Created', team: new TeamDto(team) });
        } catch (error) {
            next(error);
        }
    }

    updateTeam = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id || !mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid Team Id'));

            let { name, description, status, leader } = req.body;
            if (leader && !mongoose.Types.ObjectId.isValid(leader)) return next(ErrorHandler.badRequest('Invalid Leader Id'));

            const update = {
                name, description,
                status: status?.toLowerCase(),
                leader,
                isFavorite: req.body.isFavorite === 'true' || req.body.isFavorite === true
            };

            if (req.body.progress !== undefined) update.progress = Number(req.body.progress);
            if (req.body.progressNote !== undefined) update.progressNote = req.body.progressNote;
            if (req.file) update.image = req.file.path;

            const result = await teamService.updateTeam(id, update);
            if (result.modifiedCount !== 1) return next(ErrorHandler.serverError('Failed To Update Team'));

            res.json({ success: true, message: 'Team Updated' });
        } catch (error) {
            next(error);
        }
    }

    updateTeamProgress = async (req, res, next) => {
        try {
            const { id } = req.params;
            let { progress, progressNote } = req.body;
            if (!id || !mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid Team Id'));
            if (progress === undefined || progress === null) return next(ErrorHandler.badRequest('Progress value is required'));

            progress = Number(progress);
            if (Number.isNaN(progress) || progress < 0 || progress > 100) {
                return next(ErrorHandler.badRequest('Progress must be between 0 and 100'));
            }

            const update = { progress };
            if (typeof progressNote === 'string') update.progressNote = progressNote;

            const result = await teamService.updateTeam(id, update);
            if (result.modifiedCount !== 1) return next(ErrorHandler.serverError('Failed To Update Team Progress'));

            res.json({ success: true, message: 'Team progress updated' });
        } catch (error) {
            next(error);
        }
    }

    addMember = async (req, res, next) => {
        try {
            const { teamId, userId } = req.body;
            if (!teamId || !userId) return next(ErrorHandler.badRequest('Team ID and User ID are required'));
            if (!mongoose.Types.ObjectId.isValid(teamId)) return next(ErrorHandler.badRequest('Invalid Team Id'));
            if (!mongoose.Types.ObjectId.isValid(userId)) return next(ErrorHandler.badRequest('Invalid Employee Id'));

            const user = await userService.findUser({ _id: userId });
            if (!user) return next(ErrorHandler.notFound('No Employee Found'));
            if (!['employee', 'leader'].includes(user.type)) {
                return next(ErrorHandler.badRequest(`${user.name} is not an employee or leader`));
            }

            const isAlreadyInTeam = user.team?.some(t => {
                const tid = t._id ? t._id.toString() : t.toString();
                return tid === teamId;
            });
            if (isAlreadyInTeam) return next(ErrorHandler.badRequest(`${user.name} is already in this team`));

            const result = await userService.setTeamForUser(userId, teamId);
            if (!result || result.modifiedCount === 0) {
                return next(ErrorHandler.serverError(`Failed to add ${user.name} to team`));
            }

            res.json({ success: true, message: `Successfully added ${user.name} to team` });
        } catch (error) {
            next(error);
        }
    }

    removeMember = async (req, res, next) => {
        try {
            const { userId, teamId } = req.body;
            if (!userId || !teamId) return next(ErrorHandler.badRequest('User ID and Team ID are required'));
            if (!mongoose.Types.ObjectId.isValid(userId)) return next(ErrorHandler.badRequest('Invalid Employee Id'));
            if (!mongoose.Types.ObjectId.isValid(teamId)) return next(ErrorHandler.badRequest('Invalid Team Id'));

            const user = await userService.findUser({ _id: userId });
            if (!user) return next(ErrorHandler.notFound('No Employee Found'));
            if (!['employee', 'leader'].includes(user.type)) {
                return next(ErrorHandler.badRequest(`${user.name} is not an employee or leader`));
            }

            const isInTeam = user.team?.some(t => {
                const tid = t._id ? t._id.toString() : t.toString();
                return tid === teamId;
            });
            if (!isInTeam) return next(ErrorHandler.badRequest(`${user.name} is not in this team`));

            const result = await userService.removeTeamFromUser(userId, teamId);
            if (!result || result.modifiedCount === 0) {
                return next(ErrorHandler.serverError(`Failed to remove ${user.name} from team`));
            }

            res.json({ success: true, message: `Successfully removed ${user.name} from team` });
        } catch (error) {
            next(error);
        }
    }

    addLeader = async (req, res, next) => {
        try {
            const { userId, teamId } = req.body;
            if (!teamId || !userId) return next(ErrorHandler.badRequest('Team ID and User ID are required'));
            if (!mongoose.Types.ObjectId.isValid(teamId)) return next(ErrorHandler.badRequest('Invalid Team Id'));
            if (!mongoose.Types.ObjectId.isValid(userId)) return next(ErrorHandler.badRequest('Invalid Leader Id'));

            const user = await userService.findUser({ _id: userId });
            if (!user) return next(ErrorHandler.notFound('No Leader Found'));
            if (user.type !== 'leader') return next(ErrorHandler.badRequest(`${user.name} is not a Leader`));

            const result = await teamService.updateTeam(teamId, { leader: userId });
            if (result.modifiedCount !== 1) return next(ErrorHandler.serverError('Failed to add leader'));

            res.json({ success: true, message: `Added ${user.name} as leader` });
        } catch (error) {
            next(error);
        }
    }

    removeLeader = async (req, res, next) => {
        try {
            const { teamId } = req.body;
            if (!teamId) return next(ErrorHandler.badRequest('Team ID is required'));
            if (!mongoose.Types.ObjectId.isValid(teamId)) return next(ErrorHandler.badRequest('Invalid Team Id'));

            const result = await teamService.updateTeam(teamId, { leader: null });
            if (result.modifiedCount !== 1) return next(ErrorHandler.serverError('Failed to remove leader'));

            res.json({ success: true, message: 'Leader removed successfully' });
        } catch (error) {
            next(error);
        }
    }

    // Backward compatibility — routes that still reference addRemoveLeader
    addRemoveLeader = async (req, res, next) => {
        const action = req.path.split('/').pop();
        return action === 'add' ? this.addLeader(req, res, next) : this.removeLeader(req, res, next);
    }

    getTeams = async (req, res, next) => {
        try {
            const teams = await teamService.findTeams({});
            if (!teams) return next(ErrorHandler.notFound('No Team Found'));

            const data = await Promise.all(teams.map(async (t) => {
                const dto = new TeamDto(t);
                dto.totalMembers = await userService.findCount({ team: dto.id });
                return dto;
            }));

            res.json({ success: true, message: 'Team Found', data });
        } catch (error) {
            next(error);
        }
    }

    getTeam = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid Team Id'));

            const team = await teamService.findTeam({ _id: id });
            if (!team) return next(ErrorHandler.notFound('No Team Found'));

            const data = new TeamDto(team);
            const membersCount = await userService.findCount({ team: data.id });
            data.information = {
                employee: membersCount,
                leader: team.leader ? 1 : 0,
                admin: 0,
                totalTeam: membersCount + (team.leader ? 1 : 0)
            };

            res.json({ success: true, message: 'Team Found', data });
        } catch (error) {
            next(error);
        }
    }

    getTeamMembers = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid Team Id'));

            const members = await userService.findUsers({ team: id });
            if (!members) return next(ErrorHandler.notFound('No Team Found'));

            res.json({ success: true, message: 'Team Found', data: members.map(m => new UserDto(m)) });
        } catch (error) {
            next(error);
        }
    }

    getCounts = async (req, res, next) => {
        try {
            const [admin, employee, leader, team, invitations, progresses, employers] = await Promise.all([
                userService.findCount({ type: { $in: ['super_admin', 'sub_admin'] } }),
                userService.findCount({ type: 'employee' }),
                userService.findCount({ type: 'leader' }),
                teamService.findCount({}),
                InvitationModel.countDocuments({}),
                ProgressModel.countDocuments({}),
                EmployerModel.countDocuments({})
            ]);

            res.json({
                success: true,
                message: 'Counts Found',
                data: { admin, employee, leader, team, invitations, progresses, employers }
            });
        } catch (error) {
            next(error);
        }
    }

    deleteTeam = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id || !mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid Team Id'));

            const team = await teamService.findTeam({ _id: id });
            if (!team) return next(ErrorHandler.notFound('Team not found'));

            if (team.image) fileService.deleteTeamImage(team.image);
            await userService.removeTeamFromAllUsers(id);

            const result = await teamService.deleteTeam(id);
            if (result.deletedCount !== 1) return next(ErrorHandler.serverError('Failed to delete team'));

            res.json({ success: true, message: 'Team deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TeamController();
