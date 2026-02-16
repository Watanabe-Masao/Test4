const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const sandbox = { window: {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
const code = fs.readFileSync('features/import/csvParser.js', 'utf8');
vm.runInContext(code, sandbox);

const parseCsvToRows = sandbox.ImportCsvParser.parseCsvToRows;

const cases = [
  {
    name: 'basic csv',
    input: 'a,b,c\n1,2,3',
    expected: [['a','b','c'],['1','2','3']]
  },
  {
    name: 'quoted comma',
    input: '"a,b",c\n"x,y",z',
    expected: [['a,b','c'],['x,y','z']]
  },
  {
    name: 'escaped quotes',
    input: '"a""b",c',
    expected: [['a"b','c']]
  },
  {
    name: 'multiline quoted value',
    input: 'id,desc\n1,"line1\nline2"\n2,end',
    expected: [['id','desc'],['1','line1\nline2'],['2','end']]
  },
  {
    name: 'bom and blank lines',
    input: '\uFEFFa,b\n\n1,2\n',
    expected: [['a','b'],['1','2']]
  }
];

cases.forEach((t) => {
  const actual = JSON.parse(JSON.stringify(parseCsvToRows(t.input)));
  assert.deepStrictEqual(actual, t.expected, t.name);
});

console.log('csvParser tests passed:', cases.length);
