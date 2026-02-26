const TeamDto = require('./team-dto');

const DEFAULT_IMAGE = 'user.png';
const NOT_AVAILABLE = 'N/A';

const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

const resolveTeam = (team) => {
    if (!team) return null;
    const resolved = Array.isArray(team) && team.length > 0 ? team[0] : team;
    return new TeamDto(resolved);
};

const resolveEmpire = (empire) => {
    if (!empire) return null;
    if (typeof empire === 'object' && empire._id) return { id: empire._id, name: empire.name };
    return empire;
};

class UserDto {
    constructor(user) {
        this.id = user._id;
        this.name = user.name;
        this.username = user.username;
        this.email = user.email;
        this.mobile = user.mobile;
        this.image = user.image || DEFAULT_IMAGE;
        this.type = user.type;
        this.address = user.address;
        this.status = capitalize(user.status);
        this.team = resolveTeam(user.team);
        this.progress = typeof user.progress === 'number' ? user.progress : 0;
        this.progressNote = user.progressNote || '';
        this.empire = resolveEmpire(user.empire);
        this.designation = user.designation;
        this.project = user.project;
        this.totalMembers = user.totalMembers || 0;
        this.createdAt = user.createdAt;
        this.fatherName = user.fatherName || NOT_AVAILABLE;
        this.motherName = user.motherName || NOT_AVAILABLE;
        this.bloodGroup = user.bloodGroup || NOT_AVAILABLE;
        this.employeeId = user.employeeId || NOT_AVAILABLE;
        this.presentAddress = user.presentAddress || NOT_AVAILABLE;
        this.permanentAddress = user.permanentAddress || user.address || NOT_AVAILABLE;
        this.nid = user.nid || NOT_AVAILABLE;
        this.position = user.position || 'Not Specified';
        this.village = user.village || NOT_AVAILABLE;
        this.union = user.union || NOT_AVAILABLE;
        this.district = user.district || NOT_AVAILABLE;
    }
}

module.exports = UserDto;
