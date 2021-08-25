const express = require('express')
const path = require('path')
const emailTemplates = require('./email-templates')

const app = express()

app.use(express.static('public/'))

global.contentText = {
    title: 'My Email Template',
    signature: 'MyCompany, Road, City, Country 12345',
    footerLogo: 'assets/logo/footer.png',
    companyUrl: 'https://www.google.com/search?q=MyCompany',
    joinSubscriptionUrl: 'https://www.youtube.com/watch?v=KKuHZMD_mGs'
}

const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, '<br>')
}

app.get('/', (req, res) => {
    emailTemplates.read('example.html', {
            root: path.join(__dirname, 'templates'),
            jsErrorStyle: `
            display: block;
            background-color: #cccccc;
            color: red;
            border-radius: 5px;
            border: 2px solid black;
            padding: 3px 10px;
            text-align: left;
            font-size:14px;
            font-family: Consolas,'Andale Mono WT','Andale Mono','Lucida Console','Lucida Sans Typewriter','DejaVu Sans Mono','Bitstream Vera Sans Mono','Liberation Mono','Nimbus Mono L',Monaco,'Courier New',Courier,monospace;
            `
        }).then(p => p.text())
        .then((html) => {
            res.send(html)
        })
        .catch((err) => {
            res.status(500).send(escapeHtml(err.stack))
        })
})

app.listen(process.env.PORT || 3000)