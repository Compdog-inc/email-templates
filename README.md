# Email Templates
A template parser for emails built with NodeJS

## How to use

### Adding to project
	
To add email-templates to your project, download the newest release file and put it in your root directory.  
Then require it at the top of your script:

```js
const emailTemplates = require('./email-templates')
```
	
### Reading a template file
	
To read and parse a template file use `read(file, [options])`:

```js
emailTemplates.read('example.html').then(p => p.text())
	.then((html) => {
		console.log(html)
	})
	.catch((error) => {
		console.error("Error: " + error)
	})
```

Arguments:
- `file` - Path to template file. Must be absolute if no root specified.
- `[options]` - Additional options passed down to parse.
	- `root` - Root path of template file.
	- Other options are passed down to parse

Returns:  
`Promise<ParseResult>` - The result

### Parsing template text

To parse existing text use `parse(str, [options])`:

```js
emailTemplates.parse("<h1>Hello {{global.user.name}}!</h1>").then(p => p.text())
	.then((html) => {
		console.log(html)
	})
	.catch((error) => {
		console.error("Error: " + error)
	})
```

Arguments:
- `str` - String containing template
- `[options]` - Additional options
	- `parseStyle` - Should it convert <style> content to inline css (default: `true`)
	- `inlineJs` - Should it parse embedded js code in `{{<code>}}` (default: `true`)
	- `jsErrorStyle` - Custom style for inlineJs errors in html (example: ``` `color:red;font-size:14px;` ```)
	
Returns:  
`Promise<ParseResult>` - The result
- `ParseResult.text()` - Returns plain text version of parsed html
- `ParseResult.colorize([tokenColors])` - Returns highlighted version of parsed html (for use with `console.log`)
	- `tokenColors` - Custom colors for highlighting. Use colors from `consoleColors`. (default: `defaultTokenColors()`)
- `ParseResult.tokens()` - Returns array of parsed html tokens
