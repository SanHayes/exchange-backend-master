const axios = require('axios');

const sendMail = (to, subject, htmlContent) => {
  const data = JSON.stringify({
    "From": {
      "name": "Gatediamon support",
      "email": "info@gatediamon.one"
    },
    "To": [
      {
        "email": to
      }
    ],
    "Subject": subject,
    "ContentType": "HTML",
    "HTMLContent": htmlContent,
    "Headers": {
      "X-Mailer": "info@gatediamon.one"
    }
  });

  const config = {
    method: 'post',
    url: 'https://console.sendlayer.com/api/v1/email',
    headers: {
      'Authorization': 'Bearer F3C2CD8E-D40BC593-CD19078A-77A5DB7B',
      'Content-Type': 'application/json',
      'Cookie': 'PHPSESSID=l6a0sqdb2mm5q7qp1972ont026'
    },
    data: data
  };

  return axios(config)
  .then(response => {
    console.log(JSON.stringify(response.data));
  })
  .catch(error => {
    console.log(error);
  });  
}
module.exports = {
  sendMail
}