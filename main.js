const path = require('path')
const emailTemplates = require('./email-templates')

emailTemplates.read('example.html', {
        root: path.join(__dirname, 'templates')
    }).then(p => p.colorize())
    .then(console.log)
    .catch(console.error)