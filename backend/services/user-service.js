const UserModel = require('../models/user-model');
const LeaveModel = require('../models/leave-model');
const UserSalaryModel = require('../models/user-salary');
const bcrypt = require('bcryptjs');

const USER_POPULATE = ['team', 'empire'];

class UserService {
    // ── User CRUD ──────────────────────────────────────────────
    async createUser(data) {
        return UserModel.create(data);
    }

    async updateUser(id, data) {
        return UserModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    }

    async deleteUser(id) {
        return UserModel.findByIdAndDelete(id);
    }

    async findUser(filter) {
        return UserModel.findOne(filter).populate('empire');
    }

    async findUsers(filter) {
        return UserModel.find(filter).populate(USER_POPULATE);
    }

    async findCount(filter) {
        return UserModel.find(filter).countDocuments();
    }

    // ── Password ───────────────────────────────────────────────
    async verifyPassword(plainText, hash) {
        return bcrypt.compare(plainText, hash);
    }

    async updatePassword(id, password) {
        return UserModel.updateOne({ _id: id }, { password });
    }

    // ── Leaders ────────────────────────────────────────────────
    async findLeadersWithMemberCount() {
        return UserModel.aggregate([
            { $match: { type: 'leader' } },
            { $lookup: { from: 'teams', localField: '_id', foreignField: 'leader', as: 'team' } },
            { $lookup: { from: 'users', localField: 'team._id', foreignField: 'team', as: 'teamMembers' } },
            { $addFields: { totalMembers: { $size: '$teamMembers' } } },
            { $project: { teamMembers: 0 } }
        ]);
    }

    async findUnassignedLeaders() {
        return UserModel.aggregate([
            { $match: { type: 'leader' } },
            { $lookup: { from: 'teams', localField: '_id', foreignField: 'leader', as: 'team' } },
            { $match: { team: { $eq: [] } } }
        ]);
    }

    // ── Leave Applications ─────────────────────────────────────
    async createLeaveApplication(data) {
        return LeaveModel.create(data);
    }

    async findLeaveApplication(filter) {
        return LeaveModel.findOne(filter);
    }

    async findAllLeaveApplications(filter) {
        return LeaveModel.find(filter);
    }

    async updateLeaveApplication(id, data) {
        return LeaveModel.findByIdAndUpdate(id, data);
    }

    async deleteLeaveApplication(id) {
        return LeaveModel.findByIdAndDelete(id);
    }

    // ── Salary ─────────────────────────────────────────────────
    async assignSalary(data) {
        return UserSalaryModel.create(data);
    }

    async findSalary(filter) {
        return UserSalaryModel.findOne(filter);
    }

    async findAllSalary(filter) {
        return UserSalaryModel.find(filter);
    }

    async updateSalary(filter, data) {
        return UserSalaryModel.findOneAndUpdate(filter, data);
    }

    async deleteSalary(id) {
        return UserSalaryModel.findByIdAndDelete(id);
    }

    // ── Team membership helpers ───────────────────────────────────
    async removeTeamFromUser(userId, teamId) {
        return UserModel.updateOne({ _id: userId }, { $pull: { team: teamId } });
    }

    async removeTeamFromAllUsers(teamId) {
        return UserModel.updateMany({ team: teamId }, { $pull: { team: teamId } });
    }

    async setTeamForUser(userId, teamId) {
        return UserModel.updateOne({ _id: userId }, { $addToSet: { team: teamId } });
    }

    async searchUsers(query, selectFields = 'name type email') {
        return UserModel.find(query).select(selectFields);
    }

    // ── Backward-compatibility aliases ────────────────────────────
    async findLeaders() { return this.findLeadersWithMemberCount(); }
    async findFreeLeaders() { return this.findUnassignedLeaders(); }
    async findUsersByType(type) { return this.findUsers({ type: type.toLowerCase() }); }
    async findAdmins() { return this.findUsers({ type: { $in: ['super_admin', 'sub_admin'] } }); }
    async findAllLeaders() { return this.findUsers({ type: 'leader' }); }
    async findAllEmployees() { return this.findUsers({ type: 'employee' }); }
}

module.exports = new UserService();
