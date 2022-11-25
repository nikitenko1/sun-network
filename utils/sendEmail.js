const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (user, href) => {
  // The error exists as the email address in the "from" field in the message(in your nodejs code,,
  // to be sent using sendgrid) is not verified by sendgrid.
  const options = {
    from: process.env.SENDGRID_VERIFY_SINGLE_SENDER, // Change to your verified sender
    to: user.email,
    subject: 'Hi there! Password reset request',
    html: `<p>Hey ${user.name
      .split(' ')[0]
      .toString()}, There was a request for password reset. <a href=${href}>Click this link to 
        reset the password </a></p>
        <p>This token is valid for only 1 hour.</p>`,
  };
  try {
    await sgMail.send(options);
    console.log('Email sent');
  } catch (err) {
    console.log(err.message);
  }
};

module.exports = sendEmail;
