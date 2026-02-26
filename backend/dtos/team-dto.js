const LeaderDto = require('./leader-dto');

const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

class TeamDto {
    constructor(team) {
        this.id = team._id;
        this.name = team.name;
        this.description = team.description;
        this.image = team.image || 'team.png';
        this.admin = team.admin;
        this.status = capitalize(team.status);
        this.leader = team.leader?.name ? new LeaderDto(team.leader) : null;
        this.progress = typeof team.progress === 'number' ? team.progress : 0;
        this.progressNote = team.progressNote || '';
        this.empire = team.empire;
        this.isFavorite = team.isFavorite || false;
    }
}

module.exports = TeamDto;
