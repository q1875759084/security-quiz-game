const d=JSON.parse(require('fs').readFileSync('src/assets/chapter1.json','utf8'));
d.forEach(n => {
  const nonNull = [];
  n.choices.forEach(c => c.outcomes.forEach(o => { if(o.nextNode) nonNull.push('match='+JSON.stringify(o.match)+'->'+o.nextNode); }));
  console.log(n.id + ' [d'+n.choices[0].diceRequired+'] ' + (nonNull.length ? nonNull.join(' | ') : '(全null)'));
});
console.log('\n总节点数:', d.length);
