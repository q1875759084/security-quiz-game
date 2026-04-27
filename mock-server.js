const http = require('http');

const questions = [
  { id: 1, question: '什么是 XSS 攻击？', answer: '跨站脚本攻击，攻击者在页面注入恶意脚本' },
  { id: 2, question: '什么是 CSRF 攻击？', answer: '跨站请求伪造，利用用户已登录的身份发起恶意请求' },
  { id: 3, question: 'HTTP 和 HTTPS 的区别？', answer: 'HTTPS 在 HTTP 基础上加了 TLS 加密层' },
];

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/questions' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ code: 0, data: questions }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ code: 404, message: 'Not Found' }));
});

server.listen(3001, () => {
  console.log('Mock server running at http://localhost:3001');
});
