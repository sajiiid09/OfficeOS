const TeamDto = require('./team-dto');

const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

class LeaderDto {
    constructor(user) {
        this.id = user._id;
        this.name = user.name;
        this.username = user.username;
        this.email = user.email;
        this.mobile = user.mobile;
        this.image = user.image || 'user.png';
        this.type = capitalize(user.type);
        this.address = user.address;
        this.status = capitalize(user.status);
        this.team = user.team?.name ? new TeamDto(user.team) : null;
    }
}

module.exports = LeaderDto;
