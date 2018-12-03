module.exports = {
  "extends": "standard",
  "installedESLint": true,
  "plugins": [
      "standard",
      "promise"
  ],
  'rules': {
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
    ],
    'space-before-function-paren': [
      'error', {
        'named': 'never',
        'anonymous': 'always',
        'asyncArrow': 'always'
      }
    ],
  },
  'globals': {
    describe: false,
    it: false,
    beforeEach: false,
    afterEach: false,
    expect: false,
    fail: false,
  }
};
