const Task = require('../models/task-model');
const User = require('../models/user-model');
const Team = require('../models/team-model');
const notificationService = require('../services/notification-service');
const ErrorHandler = require('../utils/error-handler');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

class TaskController {
  createTask = async (req, res, next) => {
    try {
      const { description, assignedTo, startDate, endDate, title: bodyTitle } = req.body;
      let title = bodyTitle;

      if (!assignedTo || !mongoose.Types.ObjectId.isValid(assignedTo)) {
        return next(ErrorHandler.badRequest('Please select a valid assignee'));
      }

      if (req.user.type === 'leader') {
        const team = await Team.findOne({ leader: req.user._id });
        if (!team) return next(ErrorHandler.badRequest('You must be leading a team to assign tasks'));

        const user = await User.findById(assignedTo);
        const userTeams = Array.isArray(user?.team) ? user.team.map(id => id.toString()) : [];
        if (!user || !userTeams.includes(team._id.toString())) {
          return next(ErrorHandler.unauthorized('You can only assign tasks to members of your own team'));
        }
      }

      if (!title) {
        const user = await User.findById(assignedTo).populate('team');
        title = user?.team?.name || null;
      }

      if (!title) return next(ErrorHandler.badRequest('Title is required'));

      const task = await Task.create({
        title, description, assignedTo, startDate, endDate,
        file: req.file ? req.file.path : null,
        assignedBy: req.user._id
      });

      await notificationService.notify(assignedTo, {
        title: 'New Mission Assigned',
        message: `You have a new mission: ${title}`,
        type: 'problem',
        link: '/dashboardEmployee'
      });

      res.status(201).json({ message: 'Task created successfully', task });
    } catch (error) {
      next(error);
    }
  }

  getAdminTasks = async (req, res, next) => {
    const tasks = await Task.find({ isDeleted: false })
      .populate({
        path: 'assignedTo',
        select: 'name email type',
        populate: { path: 'team', select: 'name' }
      })
      .populate('assignedBy', 'name');
    res.json(tasks);
  }

  getLeaderTasks = async (req, res, next) => {
    const team = await Team.findOne({ leader: req.user._id });
    if (!team) return res.json([]);

    const teamMembers = await User.find({ team: team._id }).select('_id');
    const memberIds = teamMembers.map(u => u._id);

    const tasks = await Task.find({
      assignedTo: { $in: memberIds },
      isDeleted: false
    })
      .populate({
        path: 'assignedTo',
        select: 'name email type',
        populate: { path: 'team', select: 'name' }
      })
      .populate('assignedBy', 'name');

    res.json(tasks);
  }

  softDeleteTask = async (req, res, next) => {
    const task = await Task.findById(req.params.id);
    if (!task) return next(ErrorHandler.notFound('Task not found'));

    task.isDeleted = true;
    await task.save();
    res.json({ message: 'Task deleted successfully' });
  }

  downloadPDF = async (req, res, next) => {
    const task = await Task.findById(req.params.id).populate('assignedTo', 'name email');
    if (!task) return next(ErrorHandler.notFound('Task not found'));

    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.type);
    const isAssigned = task.assignedTo && task.assignedTo._id.toString() === req.user._id.toString();

    if (!isAdmin && !isAssigned) {
      return next(ErrorHandler.unauthorized('Access denied'));
    }

    const mode = req.query.mode || (isAdmin ? 'view' : 'download');
    const disposition = mode === 'view' ? 'inline' : 'attachment';

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="task-${task._id}.pdf"`);

    doc.pipe(res);
    doc.fontSize(25).text('Task Details', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Title: ${task.title}`);
    doc.moveDown();
    doc.text(`Description: ${task.description}`);
    doc.moveDown();
    if (task.startDate) doc.text(`Start Date: ${new Date(task.startDate).toLocaleDateString()}`);
    if (task.endDate) doc.text(`End Date: ${new Date(task.endDate).toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Assigned To: ${task.assignedTo ? task.assignedTo.name : 'Unknown'}`);
    doc.text(`Email: ${task.assignedTo ? task.assignedTo.email : 'Unknown'}`);
    doc.moveDown();
    doc.text(`Created At: ${new Date(task.createdAt).toLocaleString()}`);
    doc.text(`Status: ${task.isDeleted ? 'Status: Deleted' : 'Status: Active'}`);
    doc.end();
  }

  getUserTasks = async (req, res, next) => {
    const tasks = await Task.find({
      assignedTo: req.user._id,
      isDeleted: false
    }).populate('assignedBy', 'name');
    res.json(tasks);
  }

  updateTaskProgress = async (req, res, next) => {
    const { progress, progressNote } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return next(ErrorHandler.notFound('Task not found'));

    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return next(ErrorHandler.unauthorized('Unauthorized'));
    }

    task.progress = progress;
    task.progressNote = progressNote;
    await task.save();
    res.json({ success: true, message: 'Progress updated', task });
  }
}

module.exports = new TaskController();
