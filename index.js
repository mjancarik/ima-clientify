const { Transform } = require('stream');

const SERVER_SIDE = '@server-side';
const VARIABLE = '__VARIABLE__';
const CLEAR = '__CLEAR__';

class Clientify extends Transform {
  constructor(filename, options) {
    super(options);
    this._data = '';
    this._filename = filename;

    this._server = new RegExp(`${SERVER_SIDE}(.*)\n`, 'g');
  }

  _transform(buf, enc, callback) {
    this._data += buf;
    callback();
  }

  _flush(callback) {
    try {
      if (this._server.test(this._data)) {
        let rules = this._data.match(this._server);

        rules.forEach(rule => {
          this._data = this._data.replace(rule, '');

          let regPattern = rule
            .replace(`${SERVER_SIDE} `, '')
            .replace('\n', '');

          let variablePattern = regPattern
            .replace(VARIABLE, '(.*)')
            .replace(CLEAR, '(?:(?:.|\n)*)');

          const variables = this._data.match(variablePattern);
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

          let clearingParts = this._data.match(clearablePattern);

          if (clearingParts) {
            clearingParts.slice(1).forEach(part => {
              this._data = this._data.replace(part, '');
            });
          }
        });
      }

      this.push(this._data);
    } catch (err) {
      this.emit('error', err);
      return;
    }
    callback();
  }
}

module.exports = (...rest) => new Clientify(...rest);
