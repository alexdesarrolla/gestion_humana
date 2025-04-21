import lowlight from 'lowlight'

// Register common languages
lowlight.registerLanguage('html', require('highlight.js/lib/languages/xml'))
lowlight.registerLanguage('css', require('highlight.js/lib/languages/css'))
lowlight.registerLanguage('javascript', require('highlight.js/lib/languages/javascript'))
lowlight.registerLanguage('typescript', require('highlight.js/lib/languages/typescript'))
lowlight.registerLanguage('python', require('highlight.js/lib/languages/python'))

export { lowlight }