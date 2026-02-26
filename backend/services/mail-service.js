const transport = require('../configs/mail-config');
const mailTemplate = require('../templates/mail-template');

const SMTP_FROM = process.env.SMTP_AUTH_USER || 'socialcodia@gmail.com';

class MailService {
    async sendForgotPasswordMail(name, email, otp) {
        const { subject, text } = mailTemplate.forgotPassword(name, otp);
        return this.sendMail(email, subject, text);
    }

    async sendInvitationMail(email, type, link) {
        const { subject, text } = mailTemplate.invitationMail(type, link);
        return this.sendMail(email, subject, text);
    }

    async sendMail(to, subject, text) {
        return transport.sendMail({ from: SMTP_FROM, to, subject, text });
    }
}

}

module.exports = new MailService();
