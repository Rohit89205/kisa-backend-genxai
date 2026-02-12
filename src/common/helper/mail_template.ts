const email_verification = (data: any) => {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body>
        <p>Hello ${data.name},</p>
       
            <h2>Email Verification</h2>
            <p>Your OTP is: ${data.otp}</strong></p>
            <p>Also, be advised that above link is unique to the email address that is copied and should not be forwarded. Also, the time to complete this request is 5 Minutes.</p>
        
        <p>warm regards,</p>
        <p>Kisaan sathi</p>

    </body>
    </html>`;
};
const reset_password = (data: any) => {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body>
        <p>Hello ${data.name},</p>
       
            <h2>Reset Password</h2>
            <b><a href="${data.link}">Click here for reset password</a></b>
            <p>Also, be advised that above link is unique to the email address that is copied and should not be forwarded. Also, the time to complete this request is 5 Minutes.</p>
        
        <p>warm regards,</p>
        <p>Kisaan sathi</p>

    </body>
    </html>`;
};
export { email_verification, reset_password };
