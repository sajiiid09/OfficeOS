const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userService = require('../services/user-service');
const UserDto = require('../dtos/user-dto');
const TeamDto = require('../dtos/team-dto');
const crypto = require('crypto');
const teamService = require('../services/team-service');
const attendanceService = require('../services/attendance-service');
const attendanceSummaryService = require('../services/attendance-summary-service');
const problemService = require('../services/problem-service');
const progressService = require('../services/progress-service');
const fileService = require('../services/file-service');
const notificationService = require('../services/notification-service');
const socketService = require('../services/socket-service');
const InvitationModel = require('../models/invitation-model');
const TeamModel = require('../models/team-model');
const ErrorHandler = require('../utils/error-handler');


class UserController {

    createUser = async (req, res, next) => {
        try {
            const file = req.file;
            let { name, email, password, type, address, permanentAddress, mobile } = req.body;
            const username = 'user' + crypto.randomInt(11111111, 999999999);

            if (!name) return next(ErrorHandler.badRequest('Name is required'));
            if (!email) return next(ErrorHandler.badRequest('Email is required'));
            if (!password) return next(ErrorHandler.badRequest('Password is required'));
            if (!type) return next(ErrorHandler.badRequest('User type is required'));
            if (!address) return next(ErrorHandler.badRequest('Address is required'));
            if (!mobile) return next(ErrorHandler.badRequest('Mobile number is required'));
            if (!file) return next(ErrorHandler.badRequest('Profile image is required'));

            type = type.toLowerCase();

            const existingUser = await userService.findUser({ email });
            if (existingUser) return next(ErrorHandler.badRequest('Email already exists'));

            if (['super_admin', 'sub_admin'].includes(type)) {
                const { adminPassword } = req.body;
                if (!adminPassword) return next(ErrorHandler.badRequest(`Please Enter Your Password to Add ${name} as an Admin`));

                const admin = await userService.findUser({ _id: req.user._id });
                const isPasswordValid = await userService.verifyPassword(adminPassword, admin.password);
                if (!isPasswordValid) return next(ErrorHandler.unauthorized('You have entered a wrong password'));
            }

            const userResp = await userService.createUser({
                name, email, username,
                mobile: Number(mobile),
                password, type,
                address: address || permanentAddress,
                permanentAddress: permanentAddress || address,
                image: file.path
            });

            if (!userResp) return next(ErrorHandler.serverError('Failed To Create An Account'));
            res.json({ success: true, message: 'User has been Added', user: new UserDto(userResp) });
        } catch (error) {
            next(error);
        }
    }

    updateUser = async (req, res, next) => {
        try {
            const file = req.file;
            const isAdminRequest = ['super_admin', 'sub_admin'].includes(req.user.type);
            const targetId = req.params.id;
            const id = (isAdminRequest && targetId) ? targetId : req.user._id;

            if (isAdminRequest && targetId) {
                if (!mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid User Id'));

                const dbUser = await userService.findUser({ _id: id });
                if (!dbUser) return next(ErrorHandler.badRequest('No User Found'));

                const newType = req.body.type?.trim().toLowerCase();
                const currentType = dbUser.type?.trim().toLowerCase();

                if (newType && currentType && newType !== currentType) {
                    if (req.user._id.toString() === id.toString()) {
                        return next(ErrorHandler.badRequest("You Can't Change Your Own Position"));
                    }

                    const { adminPassword } = req.body;
                    if (!adminPassword) return next(ErrorHandler.badRequest('Please Enter Your Password To Change The Type'));

                    const admin = await userService.findUser({ _id: req.user._id });
                    const isPasswordValid = await userService.verifyPassword(adminPassword, admin.password);
                    if (!isPasswordValid) return next(ErrorHandler.unauthorized('You have entered a wrong password'));

                    if (currentType === 'employee' && ['super_admin', 'sub_admin', 'leader'].includes(newType) && dbUser.team) {
                        // Will remove from team when processing update below
                    }

                    if (currentType === 'leader' && ['super_admin', 'sub_admin', 'employee'].includes(newType)) {
                        const leadingTeam = await teamService.findTeam({ leader: id });
                        if (leadingTeam) {
                            return next(ErrorHandler.badRequest(`${dbUser.name} is leading a team. Please assign a new leader first.`));
                        }
                    }
                }
            }

            const updateFields = {};
            const allowedFields = [
                'name', 'username', 'email', 'mobile', 'password', 'type',
                'address', 'permanentAddress', 'status', 'progress', 'progressNote',
                'fatherName', 'motherName', 'presentAddress', 'bloodGroup',
                'employeeId', 'empire', 'village', 'union', 'district', 'position'
            ];

            for (const field of allowedFields) {
                if (req.body[field] === undefined) continue;

                if (field === 'progress' && req.body[field] !== '') {
                    updateFields[field] = Number(req.body[field]);
                } else if (field === 'type' && req.body[field]) {
                    updateFields[field] = req.body[field].trim().toLowerCase();
                } else if (field === 'status' && req.body[field]) {
                    updateFields[field] = req.body[field].trim().toLowerCase();
                } else if (field === 'empire' && req.body[field] === '') {
                    updateFields[field] = null;
                } else {
                    updateFields[field] = req.body[field];
                }
            }

            if (updateFields.password) {
                const salt = await bcrypt.genSalt(10);
                updateFields.password = await bcrypt.hash(updateFields.password, salt);
            }

            if (file) updateFields.image = file.path;

            const userResp = await userService.updateUser(id, updateFields);
            if (!userResp) return next(ErrorHandler.serverError('Failed To Update Account'));

            res.json({ success: true, message: 'Account Updated', user: new UserDto(userResp) });
        } catch (error) {
            next(error);
        }
    }

    getUsers = async (req, res, next) => {
        try {
            const { type } = req.params;
            if (!type) return next(ErrorHandler.badRequest('Type parameter is required'));

            const users = await userService.findUsers({ type: type.toLowerCase() });
            const data = users ? users.map(u => new UserDto(u)) : [];
            const label = type.charAt(0).toUpperCase() + type.slice(1);
            res.json({ success: true, message: `${label} List Found`, data });
        } catch (error) {
            next(error);
        }
    }


    getFreeEmployees = async (req, res, next) => {
        try {
            const employees = await userService.findUsers({ type: 'employee' });
            const data = employees ? employees.map(o => new UserDto(o)) : [];
            res.json({ success: true, message: 'Employees List Found', data });
        } catch (error) {
            next(error);
        }
    }

    getUser = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid User Id'));

            let user = await userService.findUser({ _id: id });
            if (!user) return next(ErrorHandler.notFound('User Not Found'));

            res.json({ success: true, message: 'Employee Found', data: new UserDto(user) });
        } catch (error) {
            next(error);
        }
    }

    getUserNoFilter = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid User Id'));

            const user = await userService.findUser({ _id: id });
            if (!user) return next(ErrorHandler.notFound('No User Found'));

            res.json({ success: true, message: 'User Found', data: new UserDto(user) });
        } catch (error) {
            next(error);
        }
    }

    getLeaders = async (req, res, next) => {
        const leaders = await userService.findLeaders();
        const data = leaders.map((o) => new UserDto(o));
        res.json({ success: true, message: 'Leaders Found', data })
    }

    getFreeLeaders = async (req, res, next) => {
        try {
            // Return all leaders since they can now be in multiple teams
            const leaders = await userService.findUsers({ type: 'leader' });
            const data = leaders ? leaders.map((o) => new UserDto(o)) : [];
            res.json({ success: true, message: 'Leaders Found', data });
        } catch (error) {
            next(error);
        }
    }

    markEmployeeAttendance = async (req, res, next) => {
        try {
            const { employeeID, location } = req.body;
            const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const TIMEZONE = process.env.TIMEZONE || 'Asia/Dhaka';
            const now = new Date();

            const checkInTime = now.toLocaleTimeString('en-US', { hour12: false, timeZone: TIMEZONE });

            const todayFilter = {
                employeeID,
                year: now.getFullYear(),
                month: now.getMonth() + 1,
                date: now.getDate()
            };

            const existing = await attendanceService.findAttendance(todayFilter);
            if (existing) {
                return next(ErrorHandler.forbidden(`${now.toLocaleDateString()} ${DAYS[now.getDay()]} Attendance Already Marked!`));
            }

            const attendance = await attendanceService.markAttendance({
                ...todayFilter,
                day: DAYS[now.getDay()],
                present: true,
                checkInTime,
                checkInLocation: location || null
            });
            if (!attendance) return next(ErrorHandler.serverError('Failed to mark attendance'));

            res.json({
                success: true,
                newAttendance: attendance,
                message: `${now.toLocaleDateString()} ${DAYS[now.getDay()]} Attendance Marked! Check-in: ${checkInTime}`
            });
        } catch (error) {
            next(error);
        }
    }

    markEmployeeCheckOut = async (req, res, next) => {
        try {
            const { employeeID, location } = req.body;
            const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const TIMEZONE = process.env.TIMEZONE || 'Asia/Dhaka';
            const now = new Date();

            const checkOutTime = now.toLocaleTimeString('en-US', { hour12: false, timeZone: TIMEZONE });

            const todayAttendance = await attendanceService.findAttendance({
                employeeID,
                year: now.getFullYear(),
                month: now.getMonth() + 1,
                date: now.getDate()
            });

            if (!todayAttendance) return next(ErrorHandler.notFound('No attendance record found for today. Please mark attendance first.'));
            if (todayAttendance.checkOutTime) return next(ErrorHandler.forbidden('Check-out already marked!'));

            const updated = await attendanceService.updateAttendance(todayAttendance._id, {
                checkOutTime,
                checkOutLocation: location || null
            });
            if (!updated) return next(ErrorHandler.serverError('Failed to mark check-out'));

            res.json({
                success: true,
                checkOutTime,
                message: `${now.toLocaleDateString()} ${DAYS[now.getDay()]} Check-out Marked! Time: ${checkOutTime}`
            });
        } catch (error) {
            next(error);
        }
    }

    viewEmployeeAttendance = async (req, res, next) => {
        try {
            const resp = await attendanceService.findAllAttendance(req.body);
            if (!resp) return next(ErrorHandler.notFound('No Attendance found'));
            res.json({ success: true, data: resp });
        } catch (error) {
            next(error);
        }
    }

    applyLeaveApplication = async (req, res, next) => {
        try {
            const { applicantID, title, type, startDate, endDate, appliedDate, period, reason } = req.body;

            const existing = await userService.findLeaveApplication({ applicantID, startDate, endDate, appliedDate });
            if (existing) return next(ErrorHandler.forbidden('Leave Already Applied'));

            const leave = await userService.createLeaveApplication({
                applicantID, title, type, startDate, endDate, appliedDate, period, reason,
                adminResponse: 'Pending'
            });
            if (!leave) return next(ErrorHandler.serverError('Failed to apply leave'));

            res.json({ success: true, data: leave });
        } catch (error) {
            next(error);
        }
    }

    viewLeaveApplications = async (req, res, next) => {
        try {
            const resp = await userService.findAllLeaveApplications(req.body);
            if (!resp) return next(ErrorHandler.notFound('No Leave Applications found'));
            res.json({ success: true, data: resp });
        } catch (error) {
            next(error);
        }
    }

    updateLeaveApplication = async (req, res, next) => {
        try {
            const { id } = req.params;
            const body = req.body;

            const leaveApp = await userService.findLeaveApplication({ _id: id });
            if (!leaveApp) return next(ErrorHandler.notFound('Leave application not found'));

            const previousStatus = leaveApp.adminResponse;
            const newStatus = body.adminResponse;

            if (body.startDate || body.endDate) {
                const start = new Date(body.startDate || leaveApp.startDate);
                const end = new Date(body.endDate || leaveApp.endDate);
                body.period = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
            }

            const updated = await userService.updateLeaveApplication(id, body);
            if (!updated) return next(ErrorHandler.serverError('Failed to update leave'));

            if (newStatus === 'Approved') {
                const updatedLeaveApp = await userService.findLeaveApplication({ _id: id });
                await attendanceSummaryService.createLeaveAttendanceRecords(id, {
                    applicantID: updatedLeaveApp.applicantID,
                    startDate: updatedLeaveApp.startDate,
                    endDate: updatedLeaveApp.endDate
                });
            } else if (previousStatus === 'Approved' && newStatus !== 'Approved') {
                await attendanceSummaryService.removeLeaveAttendanceRecords(id);
            }

            res.json({ success: true, message: 'Leave Updated' });
        } catch (error) {
            next(error);
        }
    }

    deleteLeaveApplication = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid Leave Application Id'));

            await attendanceSummaryService.removeLeaveAttendanceRecords(id);

            const result = await userService.deleteLeaveApplication(id);
            if (!result) return next(ErrorHandler.serverError('Failed to delete leave application'));

            res.json({ success: true, message: 'Leave application deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    assignEmployeeSalary = async (req, res, next) => {
        try {
            const data = req.body;
            if (!data.bonus) data.bonus = 0;
            if (!data.reasonForBonus) data.reasonForBonus = 'N/A';

            const now = new Date();
            const year = data.year || now.getFullYear();
            const month = data.month || (now.getMonth() + 1);

            const existing = await userService.findSalary({ employeeID: data.employeeID, year, month });
            if (existing) return next(ErrorHandler.conflict('Salary already assigned for this month'));

            data.year = year;
            data.month = month;
            data.assignedDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

            const salary = await userService.assignSalary(data);
            if (!salary) return next(ErrorHandler.serverError('Failed to assign salary'));

            await notificationService.notify(data.employeeID, {
                title: 'Salary Assigned',
                message: `Your salary for ${month}/${year} has been assigned.`,
                type: 'salary',
                link: '/userSalary'
            });

            res.json({ success: true, data: salary });
        } catch (error) {
            next(error);
        }
    }

    updateEmployeeSalary = async (req, res, next) => {
        try {
            const { employeeID, month, year } = req.body;
            const now = new Date();
            const targetMonth = month || (now.getMonth() + 1);
            const targetYear = year || now.getFullYear();

            req.body.assignedDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

            const updated = await userService.updateSalary(
                { employeeID, month: targetMonth, year: targetYear },
                req.body
            );
            if (!updated) return next(ErrorHandler.serverError('Failed to update salary'));

            await notificationService.notify(employeeID, {
                title: 'Salary Updated',
                message: `Your salary for ${targetMonth}/${targetYear} has been updated.`,
                type: 'salary',
                link: '/userSalary'
            });

            res.json({ success: true, message: 'Salary Updated' });
        } catch (error) {
            next(error);
        }
    }

    viewSalary = async (req, res, next) => {
        try {
            const resp = await userService.findAllSalary(req.body);
            if (!resp) return next(ErrorHandler.notFound('No Salary Found'));
            res.json({ success: true, data: resp });
        } catch (error) {
            next(error);
        }
    }

    // Get users filtered by type
    getUsersByType = async (req, res, next) => {
        try {
            const { type } = req.params;
            if (!type) return next(ErrorHandler.badRequest('Type parameter is required'));

            const users = await userService.findUsersByType(type);
            const usersDto = users ? users.map(user => new UserDto(user)) : [];
            res.json({ success: true, data: usersDto });
        } catch (error) {
            next(error);
        }
    }

    getAdminUsers = async (req, res, next) => {
        try {
            const users = await userService.findAdmins();
            const data = users ? users.map(u => new UserDto(u)) : [];
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    getLeaderUsers = async (req, res, next) => {
        try {
            const users = await userService.findLeaders();
            const data = users ? users.map(u => new UserDto(u)) : [];
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    getEmployeeUsers = async (req, res, next) => {
        try {
            const users = await userService.findAllEmployees();
            const data = users ? users.map(u => new UserDto(u)) : [];
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    deleteUser = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid User Id'));

            const user = await userService.findUser({ _id: id });
            if (!user) return next(ErrorHandler.notFound('User not found'));

            if (user.type === 'leader') {
                const teams = await teamService.findTeams({ leader: id });
                for (const team of (teams || [])) {
                    await userService.removeTeamFromAllUsers(team._id);
                    await teamService.updateTeam(team._id, { leader: null });
                }
            }

            await fileService.deleteUserFiles(user, problemService);
            await InvitationModel.deleteMany({ email: user.email });

            const result = await userService.deleteUser(id);
            if (!result) return next(ErrorHandler.serverError('Failed to delete user'));

            res.json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    deleteSalary = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid Salary Id'));

            const result = await userService.deleteSalary(id);
            if (!result) return next(ErrorHandler.serverError('Failed to delete salary record'));

            res.json({ success: true, message: 'Salary record deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    getAttendanceSummary = async (req, res, next) => {
        try {
            const { userId } = req.params;
            const { startDate, endDate } = req.query;

            const targetUserId = userId || req.user?._id;
            if (!targetUserId) return next(ErrorHandler.unauthorized('Unauthorized Access'));
            if (userId && !mongoose.Types.ObjectId.isValid(userId)) return next(ErrorHandler.badRequest('Invalid User Id'));

            const dateRange = {};
            if (startDate) dateRange.startDate = new Date(startDate);
            if (endDate) dateRange.endDate = new Date(endDate);

            const summary = await attendanceSummaryService.getAttendanceSummary(
                targetUserId,
                Object.keys(dateRange).length > 0 ? dateRange : null
            );

            res.json({ success: true, data: summary });
        } catch (error) {
            next(error);
        }
    }

    editAttendance = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid attendance ID'));

            const updated = await attendanceService.updateAttendance(id, req.body);
            if (!updated) return next(ErrorHandler.notFound('Attendance record not found'));

            res.json({ success: true, message: 'Attendance updated successfully', data: updated });
        } catch (error) {
            next(error);
        }
    }

    recalculateSalary = async (req, res, next) => {
        try {
            const { userId } = req.params;
            const { month, year, baseSalary } = req.body;
            if (!mongoose.Types.ObjectId.isValid(userId)) return next(ErrorHandler.badRequest('Invalid user ID'));

            const firstDay = new Date(year, month - 1, 1);
            const lastDay = new Date(year, month, 0);

            const summary = await attendanceSummaryService.getAttendanceSummary(userId, {
                startDate: firstDay,
                endDate: lastDay
            });

            const attendanceRatio = summary.totalDays > 0 ? summary.presentDays / summary.totalDays : 0;
            const calculatedSalary = Math.round(baseSalary * attendanceRatio);
            const assignedDate = new Date().toISOString().split('T')[0];

            const existingSalary = await userService.findSalary({ employeeID: userId, month, year });
            if (existingSalary) {
                await userService.updateSalary({ employeeID: userId, month, year }, { salary: calculatedSalary, assignedDate });
            } else {
                await userService.assignSalary({ employeeID: userId, salary: calculatedSalary, month, year, assignedDate });
            }

            res.json({
                success: true,
                message: 'Salary recalculated successfully',
                data: { summary, calculatedSalary, baseSalary, attendanceRatio: (attendanceRatio * 100).toFixed(2) + '%' }
            });
        } catch (error) {
            next(error);
        }
    }

    globalSearch = async (req, res, next) => {
        try {
            const { q } = req.query;
            if (!q) return res.json({ success: true, data: [] });

            const searchRegex = new RegExp(q, 'i');
            const users = await userService.findUsers({
                $or: [
                    { name: searchRegex },
                    { email: searchRegex },
                    { mobile: searchRegex },
                    { employeeId: searchRegex }
                ]
            });

            const data = users ? users.map(u => new UserDto(u)) : [];
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    updateUserProgress = async (req, res, next) => {
        try {
            const { id } = req.params;
            let { progress, progressNote } = req.body;

            if (!id || !mongoose.Types.ObjectId.isValid(id)) return next(ErrorHandler.badRequest('Invalid User ID'));
            if (progress === undefined || progress === null) return next(ErrorHandler.badRequest('Progress value is required'));

            progress = Number(progress);
            if (Number.isNaN(progress) || progress < 0 || progress > 100) {
                return next(ErrorHandler.badRequest('Progress must be between 0 and 100'));
            }

            const user = await userService.updateUser(id, { progress, progressNote: progressNote || '' });
            if (!user) return next(ErrorHandler.notFound('User not found'));

            await progressService.upsertForUser(id, progress, progressNote);

            socketService.emitToAll('progress-update', {
                userId: id, progress, progressNote: progressNote || '', updatedAt: new Date()
            });

            res.json({ success: true, message: 'User progress updated', data: user });
        } catch (error) {
            next(error);
        }
    }

    getLeaderboardData = async (req, res, next) => {
        try {
            const { type: role, _id: userId, team: userTeamId } = req.user;
            const { mode, type: filterType } = req.query;
            let data = [];

            if (mode === 'teams') {
                data = await teamService.findTeams({});
            } else if (filterType) {
                data = await userService.findUsers({ type: filterType });
            } else if (['super_admin', 'sub_admin'].includes(role.toLowerCase())) {
                const [employees, leaders] = await Promise.all([
                    userService.findUsers({ type: 'employee' }),
                    userService.findUsers({ type: 'leader' })
                ]);
                data = [...employees, ...leaders];
            } else if (role.toLowerCase() === 'leader') {
                const myTeams = await teamService.findTeams({ leader: userId });
                const myTeamIds = myTeams.map(t => t._id);
                const [members, leaders] = await Promise.all([
                    userService.findUsers({ team: { $in: myTeamIds }, type: 'employee' }),
                    userService.findUsers({ type: 'leader' })
                ]);
                const uniqueUsers = new Map();
                [...members, ...leaders].forEach(u => uniqueUsers.set(u._id.toString(), u));
                data = Array.from(uniqueUsers.values());
            } else if (userTeamId) {
                data = await userService.findUsers({ team: userTeamId });
            } else {
                data = [req.user];
            }

            const Dto = mode === 'teams' ? TeamDto : UserDto;
            res.json({ success: true, data: data.map(item => new Dto(item)) });
        } catch (error) {
            next(error);
        }
    }

    getUserListData = async (req, res, next) => {
        try {
            let query = {
                type: { $in: ['employer', 'team', 'employee', 'leader'] },
                status: { $in: ['active', 'deactive'] }
            };

            if (req.user?.type === 'leader') {
                const teams = await TeamModel.find({ leader: req.user._id });
                const teamIds = teams.map(t => t._id);
                query = {
                    team: { $in: teamIds },
                    status: { $in: ['active', 'deactive'] },
                    type: { $in: ['employee', 'leader'] }
                };
            }

            const users = await userService.searchUsers(query, 'name type email');
            res.json(users);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();
