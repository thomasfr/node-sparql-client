module.exports = {
  "extends": "standard",
  "installedESLint": true,
  "plugins": [
      "standard",
      "promise"
  ],
  'rules': {
    'indent': [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'no-unused-vars': [
      'error', {
        'vars': 'all',
        "argsIgnorePattern": '^_',
      }
    ],
    'semi': [
      'error',
      'always'
    ]
  }
};
