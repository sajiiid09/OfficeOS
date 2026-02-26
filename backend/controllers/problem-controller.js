const problemService = require('../services/problem-service');
const ErrorHandler = require('../utils/error-handler');
const mongoose = require('mongoose');
const fileService = require('../services/file-service');
const notificationService = require('../services/notification-service');

class ProblemController {
  submitProblem = async (req, res, next) => {
    try {
      const { project, problemLocation, description, priority, empireId } = req.body;
      const file = req.file;
      if (!project || !problemLocation || !description) {
        return next(ErrorHandler.badRequest('Required fields are missing'));
      }

      const problem = await problemService.createProblem({
        user: req.user._id,
        project, problemLocation, description,
        priority: priority || 'Low',
        image: file ? file.path : undefined,
        empire: empireId
      });
      if (!problem) return next(ErrorHandler.serverError('Failed to submit problem'));

      await notificationService.notifyAdmins({
        title: 'New Mission Report',
        message: `${req.user.name} submitted a new report: ${project}`,
        type: 'problem',
        link: '/admin/problems'
      });

      res.json({ success: true, message: 'Problem submitted successfully', data: problem });
    } catch (error) {
      next(error);
    }
  }

  getUserProblems = async (req, res, next) => {
    const problems = await problemService.findProblems({ user: req.user._id });
    res.json({
      success: true,
      data: problems
    });
  }

  getAllProblems = async (req, res, next) => {
    const problems = await problemService.findProblems({});
    res.json({
      success: true,
      data: problems
    });
  }

  getScopedProblems = async (req, res, next) => {
    try {
      const Team = mongoose.model('Team');
      const User = mongoose.model('User');

      const team = await Team.findOne({ leader: req.user._id });
      if (!team) return res.json({ success: true, message: 'No team assigned', data: [] });

      const members = await User.find({ team: team._id });
      const memberIds = members.map(m => m._id);

      const problems = await problemService.findProblems({ user: { $in: memberIds } });
      res.json({ success: true, data: problems });
    } catch (error) {
      next(error);
    }
  }

  updateProblemStatus = async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return next(ErrorHandler.badRequest('Status is required'));
    }

    const problem = await problemService.updateProblem(id, { status });
    if (!problem) {
      return next(ErrorHandler.notFound('Problem not found'));
    }

    res.json({
      success: true,
      message: 'Problem status updated successfully',
      data: problem
    });
  }

  provideSolution = async (req, res, next) => {
    const { id } = req.params;
    const { solution } = req.body;

    if (!solution) return next(ErrorHandler.badRequest('Solution is required'));

    const problem = await problemService.updateProblem(id, {
      adminSolution: solution,
      solutionDate: new Date(),
      status: 'Checked', // Auto-update status to Checked when solved
      solutionBy: req.user.type // 'Admin' or 'Leader'
    });

    if (!problem) return next(ErrorHandler.notFound('Problem not found'));

    res.json({
      success: true,
      message: 'Solution provided successfully',
      data: problem
    });
  }

  getProblem = async (req, res, next) => {
    const { id } = req.params;
    const problem = await problemService.findProblem({ _id: id });
    if (!problem) {
      return next(ErrorHandler.notFound('Problem not found'));
    }
    res.json({
      success: true,
      data: problem
    });
  }

  deleteProblem = async (req, res, next) => {
    const { id } = req.params;
    const problem = await problemService.findProblem({ _id: id });
    if (!problem) {
      return next(ErrorHandler.notFound('Problem not found'));
    }

    if (problem.image) {
      fileService.deleteProblemImage(problem.image);
    }

    const result = await problemService.deleteProblem(id);
    if (!result) {
      return next(ErrorHandler.serverError('Failed to delete problem'));
    }
    res.json({
      success: true,
      message: 'Problem deleted successfully'
    });
  }
}

module.exports = new ProblemController();
