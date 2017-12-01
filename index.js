const { Transform } = require('stream');

const SERVER_SIDE = '@server-side';
const VARIABLE = '__VARIABLE__';
const CLEAR = '__CLEAR__';

const SERVER_SIDE_DETECTOR = new RegExp(`${SERVER_SIDE}(.*)\n`, 'g');

function clientify(content) {
  if (SERVER_SIDE_DETECTOR.test(content)) {
    let rules = content.match(SERVER_SIDE_DETECTOR);

    rules.forEach(rule => {
      content = content.replace(rule, '');

      let regPattern = rule.replace(`${SERVER_SIDE} `, '').replace('\n', '');

      let variablePattern = regPattern
        .replace(VARIABLE, '(.*)')
        .replace(CLEAR, '(?:(?:.|\n)*)');

      const variables = content.match(variablePattern);
      let variableKey = 0;

      let clearablePattern = regPattern
        .replace(VARIABLE, () => {
          variableKey += 1;

          if (!variables || !variables[variableKey]) {
            return '';
          }

          return variables[variableKey];
        })
        .replace(CLEAR, '((.|\n)*)');

      let clearingParts = content.match(clearablePattern);

      if (clearingParts) {
        clearingParts.slice(1).forEach(part => {
          content = content.replace(part, '');
        });
      }
    });
  }

  return content;
}

class ClientifyStream extends Transform {
  constructor(filename, options) {
    super(options);
    this._data = '';
    this._filename = filename;
  }

  _transform(buf, enc, callback) {
    this._data += buf;
    callback();
  }

  _flush(callback) {
    try {
      let content = clientify(this._data);

      this.push(content);
    } catch (err) {
      this.emit('error', err);
      return;
    }
    callback();
  }
}

module.exports = (...rest) => new ClientifyStream(...rest);
module.exports.clientify = clientify;
