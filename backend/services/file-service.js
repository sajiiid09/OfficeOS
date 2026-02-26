const fs = require('fs');
const path = require('path');

class FileService {
  constructor() {
    this.basePath = path.join(__dirname, '..', 'public', 'storage');
  }

  /**
   * Delete a file from local storage.
   * @param {string} folder - Sub-folder (e.g. 'images/profile')
   * @param {string} filename - Either a relative storage path or just the filename
   * @returns {boolean}
   */
  static DEFAULT_IMAGES = ['user.png', 'team.png'];

  async deleteFile(folder, filename) {
    if (!filename || FileService.DEFAULT_IMAGES.includes(filename)) return false;
    if (filename.startsWith('http')) return false;

    // Try full relative storage path first (e.g. images/profile/xxx.jpg)
    let filePath = path.join(this.basePath, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }

    // Fallback: folder + basename (legacy paths)
    filePath = path.join(this.basePath, folder, path.basename(filename));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }

    return false;
  }

  deleteProfileImage(filename) {
    return this.deleteFile('images/profile', filename);
  }

  deleteProblemImage(filename) {
    return this.deleteFile('images/problems', filename);
  }

  deleteTeamImage(filename) {
    return this.deleteFile('images/teams', filename);
  }

  deleteTaskFile(filename) {
    return this.deleteFile('files/tasks', filename);
  }

  deleteChatFile(filename) {
    return this.deleteFile('files/chat', filename);
  }

  async deleteUserFiles(user, problemService) {
    if (!user) return;

    // 1. Delete Profile Image
    if (user.image) {
      await this.deleteProfileImage(user.image);
    }

    // 2. Delete Problem Images associated with this user
    if (problemService) {
      try {
        const problems = await problemService.findProblems({ user: user._id });
        if (problems && problems.length > 0) {
          for (const problem of problems) {
            if (problem.image) {
              await this.deleteProblemImage(problem.image);
            }
          }
        }
      } catch (_error) {
        // Silently continue — problem image cleanup is best-effort
      }
    }
  }
}

module.exports = new FileService();
