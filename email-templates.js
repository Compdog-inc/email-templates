const fs = require('fs')
const pth = require('path')

const consoleColors = {
    FgBlack: 30,
    FgRed: 31,
    FgGreen: 32,
    FgYellow: 33,
    FgBlue: 34,
    FgMagenta: 35,
    FgCyan: 36,
    FgWhite: 37,

    BgBlack: 40,
    BgRed: 41,
    BgGreen: 42,
    BgYellow: 43,
    BgBlue: 44,
    BgMagenta: 45,
    BgCyan: 46,
    BgWhite: 47
}

const defaultTokenColors = () => ({
    htmlTag: [consoleColors.FgCyan],
    closingHtmlTag: [consoleColors.FgCyan],
    htmlContents: [consoleColors.FgWhite],
    htmlTagContents: [consoleColors.FgRed],
    htmlAttributeName: [consoleColors.FgYellow],
    htmlAttributeEquals: [consoleColors.FgWhite],
    htmlAttributeContents: [consoleColors.FgGreen]
})

/**
 * Reads and parses template
 * @param {string} path The path to the template
 * @param {{root?:string,useClasses?:boolean}} [options] Options that don't get used are passed down to parse
 * @returns {Promise<{text:()=>string,colorize:(tokenColors?:{htmlTag: number[],htmlContents: number[],htmlTagContents: number[],htmlAttributeName: number[],htmlAttributeEquals: number[],htmlAttributeContents: number[]})=>string,tokens:()=>{token:string,text:string}[]}>} The parsed template
 */
const read = function(path, options) {
    if (!path) throw ('Path is a required field for function read');

    return new Promise((resolve, reject) => {
        let fPath;
        if (options && options.root) {
            fPath = pth.join(options.root, path)
        } else {
            fPath = path
        }

        fs.readFile(fPath, "UTF-8", (err, data) => {
            if (err) reject(err);
            else {
                try {
                    const p = parse(data, options)
                    resolve(p)
                } catch (e) {
                    reject(e)
                }
            }
        })
    })
}

/**
 * 
 * @param {string} str The template text
 * @param {{useClasses?:boolean}} [options] Options for parsing
 * @returns {Promise<{text:()=>string,colorize:(tokenColors?:{htmlTag: number[],htmlContents: number[],htmlTagContents: number[],htmlAttributeName: number[],htmlAttributeEquals: number[],htmlAttributeContents: number[]})=>string,tokens:()=>{token:string,text:string}[]}>} The parsed template
 */
const parse = function(str, options) {
    if (typeof(str) !== 'string') throw ('Str is a required field for function parse');

    if (!options) options = {}
    if (typeof(options.useClasses) === 'undefined') options.useClasses = true

    return new Promise((resolve, reject) => {
        let tokens = []
        const parseHtml = () => {
            let position = 0
            let token = null
            let tokenText = ''

            const pushToken = () => {
                tokens.push({ token: token, text: tokenText })
                tokenText = ''
            }

            while (position < str.length) {
                let c = str[position]

                const next = () => {
                    position++
                    c = str[position]
                    return c
                }

                switch (token) {
                    case null:
                        switch (c) {
                            case '<':
                                token = 'htmlTag'
                                next()
                                continue
                            default:
                                token = 'htmlContents'
                                tokenText += c
                                break
                        }
                        break
                    case 'htmlContents':
                        switch (c) {
                            case '<':
                                pushToken()
                                token = 'htmlTag'
                                next()
                                continue
                            default:
                                tokenText += c
                                break
                        }
                        break
                    case 'htmlTag':
                    case 'closingHtmlTag':
                        switch (c) {
                            case '/':
                                token = 'closingHtmlTag'
                                next()
                                continue
                        }
                    case 'htmlTagContents':
                        switch (c) {
                            case ' ':
                                tokenText += c
                                pushToken()
                                token = 'htmlTagContents'
                                break
                            case '>':
                                pushToken()
                                token = 'htmlContents'
                                break
                            default:
                                if (token == 'htmlTagContents') {
                                    pushToken()
                                    token = 'htmlAttributeName'
                                    tokenText += c
                                } else {
                                    tokenText += c
                                }
                                break
                        }
                        break
                    case 'htmlAttributeName':
                        switch (c) {
                            case '=':
                                pushToken()
                                token = 'htmlAttributeEquals'
                                tokenText += c
                                break
                            case ' ':
                                pushToken()
                                token = 'htmlTagContents'
                                tokenText += c
                                break
                            case '>':
                                pushToken()
                                token = null
                                break
                            default:
                                tokenText += c
                                break
                        }
                        break
                    case "htmlAttributeEquals":
                        switch (c) {
                            case '"':
                                pushToken()
                                token = 'htmlAttributeContents'
                                break
                            case '>':
                                pushToken()
                                token = null
                                break
                        }
                        break
                    case "htmlAttributeContents":
                        switch (c) {
                            case '"':
                                next()
                                pushToken()
                                token = 'htmlTagContents'
                                continue
                            default:
                                tokenText += c
                                break
                        }
                        break
                }

                next()
            }

            if (token != null) {
                pushToken()
            }
        }

        parseHtml()

        const parseClasses = () => {
            let inStyle = false
            let styleTokens = []
            let styleText = ''
            for (var i = 0; i < tokens.length; i++) {
                let curToken = tokens[i];
                if (curToken.token == 'htmlTag' && curToken.text.trim().toLowerCase() == 'style') {
                    inStyle = true
                    styleTokens.push(curToken)
                } else if (curToken.token == 'closingHtmlTag' && curToken.text.trim().toLowerCase() == 'style') {
                    inStyle = false
                    styleTokens.push(curToken)
                } else if (curToken.token == 'htmlContents' && inStyle) {
                    styleText += curToken.text
                    styleTokens.push(curToken)
                } else if (inStyle) {
                    styleTokens.push(curToken)
                }
            }

            tokens = tokens.filter((v) => {
                return !styleTokens.includes(v)
            })

            const replaceAll = (s, o, r) => {
                while (s.includes(o)) s = s.replace(o, r)
                return s
            }

            let elements = {}
            let classes = {}
            let position = 0
            let currentTokenId = null
            let currentName = '';
            let currentToken = ''
            let inToken = false
            while (position < styleText.length) {
                let c = styleText[position]
                switch (c) {
                    case '.':
                        currentTokenId = 'class'
                        currentToken = ''
                        inToken = true
                        break
                    case '{':
                        currentName = currentToken.trim()
                        currentToken = ''
                        break
                    case '}':
                        if (inToken) {
                            inToken = false
                            let t = replaceAll(replaceAll(replaceAll(replaceAll(currentToken, '\r', ''), '\n', ''), '\t', ''), ' ', '')

                            switch (currentTokenId) {
                                case 'class':
                                    classes[currentName] = t
                                    break
                                case 'element':
                                    elements[currentName] = t
                            }

                            currentName = ''
                            currentTokenId = null
                        }
                        break
                    default:
                        if (inToken) {
                            currentToken += c
                        } else {
                            currentTokenId = 'element'
                            currentToken = c
                            inToken = true
                        }
                        break
                }
                position++
            }

            let currentTag = null
            let inClassAttribute = false
            let classTokens = []
            let elementClasses = []
            let matchedElements = []

            for (var i = 0; i < tokens.length; i++) {
                let curToken = tokens[i];
                if (curToken.token == 'htmlTag') {
                    currentTag = curToken
                    if (elements[curToken.text.trim().toLowerCase()]) matchedElements.push(curToken)
                } else if (curToken.token == 'closingHtmlTag') currentTag = null
                else if (curToken.token == 'htmlAttributeName' && curToken.text.trim().toLowerCase() == 'class') {
                    inClassAttribute = true
                    classTokens.push(curToken)
                } else if (curToken.token == 'htmlAttributeContents' && inClassAttribute) {
                    let cls = curToken.text.split(' ')
                    elementClasses.push({ tag: currentTag, classes: cls })
                    classTokens.push(curToken)
                } else if (curToken.token == 'htmlAttributeEquals' && inClassAttribute) {
                    classTokens.push(curToken)
                } else if (inClassAttribute) {
                    inClassAttribute = false
                }
            }

            tokens = tokens.filter((v) => {
                return !classTokens.includes(v)
            })

            for (var i = 0; i < matchedElements.length; i++) {
                let ind = tokens.indexOf(matchedElements[i])
                let style = elements[matchedElements[i].text.trim().toLowerCase()]
                tokens.splice(ind + 1, 0, { token: 'htmlAttributeName', text: 'style' }, { token: 'htmlAttributeEquals', text: '=' }, { token: 'htmlAttributeContents', text: style }, { token: 'htmlTagContents', text: ' ' })
            }

            for (var i = 0; i < elementClasses.length; i++) {
                let ind = tokens.indexOf(elementClasses[i].tag)
                let classesText = []
                elementClasses[i].classes.forEach((v) => { classesText.push(classes[v]) })
                tokens.splice(ind + 1, 0, { token: 'htmlAttributeName', text: 'style' }, { token: 'htmlAttributeEquals', text: '=' }, { token: 'htmlAttributeContents', text: classesText.join('') }, { token: 'htmlTagContents', text: ' ' })
            }
        }

        if (options.useClasses) {
            parseClasses()
        }

        const stringifyTokens = function(p) {
            p = p || (t => t.text)

            let res = ''
            for (var i = 0; i < tokens.length; i++) {
                let curToken = tokens[i];
                let nextToken = (tokens[i + 1] || {});
                let prevToken = (tokens[i - 1] || {});

                switch (curToken.token) {
                    case 'htmlTag':
                    case 'closingHtmlTag':
                        res += (curToken.token == 'htmlTag' ? '<' : '</') + p(curToken);
                        if (nextToken.token == 'htmlContents') {
                            res += '>'
                        }
                        break;
                    case 'htmlContents':
                        if (prevToken.token == 'htmlTagContents' || prevToken.token == 'htmlAttributeName' || prevToken.token == 'htmlAttributeContents') {
                            res += '>'
                        }
                    case 'htmlTagContents':
                    case 'htmlAttributeName':
                    case 'htmlAttributeEquals':
                        res += p(curToken)
                        break
                    case 'htmlAttributeContents':
                        res += '"' + p(curToken) + '"'
                        break
                }
            }

            return res.trimStart().trimEnd();
        }

        const text = function() {
            return stringifyTokens()
        }

        const setColor = function(text, fg, bg) {
            let fgText = '';
            let bgText = '';

            if (fg) fgText = '\x1b[' + fg + 'm';
            if (bg) bgText = '\x1b[' + bg + 'm';

            return bgText + fgText + text + '\x1b[0m'
        }

        const tokenColorsC = defaultTokenColors()

        const colorize = function(tokenColors) {
            return stringifyTokens((t) => setColor(t.text, (tokenColors || tokenColorsC)[t.token][0], (tokenColors || tokenColorsC)[t.token][1]))
        }

        const tokensF = function() {
            return tokens
        }

        resolve({
            text: text,
            colorize: colorize,
            tokens: tokensF
        })
    })
}

module.exports = {
    read: read,
    parse: parse,
    consoleColors: consoleColors,
    /**
     * 
     * @returns {()=>{htmlTag: number[],closingHtmlTag: number[],htmlContents: number[],htmlTagContents: number[],htmlAttributeName: number[],htmlAttributeEquals: number[],htmlAttributeContents: number[]}} Default token colors for colorize
     */
    defaultTokenColors: defaultTokenColors
}