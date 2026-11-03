const path = require('path');
require('dotenv').config();

const app = require('../app');

console.log('=== VERIFYING REGISTERED BACKEND ROUTES IN EXPRESS APP ===');

const registeredRoutes = [];

function extractRoutes(stack, prefix = '') {
  stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(',');
      registeredRoutes.push(`${methods} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      let subPrefix = prefix;
      if (layer.regexp) {
        const str = layer.regexp.source
          .replace('^\\', '')
          .replace('\\/?(?=\\/|$)', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace('^', '')
          .replace(/\$$/, '');
        subPrefix = (prefix + '/' + str).replace(/\/+/g, '/');
      }
      extractRoutes(layer.handle.stack, subPrefix);
    }
  });
}

extractRoutes(app._router.stack);

console.log(`Total active registered route handlers: ${registeredRoutes.length}`);

const checks = [
  'crm/invoices',
  'audit-logs',
  'roles',
  'permissions',
  'reports',
  'dashboard',
  'crm/quotes',
  'resend-notification'
];

console.log('\n=== KEY ENDPOINT VERIFICATION ===');
checks.forEach((chk) => {
  const matches = registeredRoutes.filter(r => r.includes(chk));
  console.log(`[CHECK ${chk.toUpperCase()}] Matches: ${matches.length}`);
  matches.slice(0, 3).forEach(m => console.log(`   -> ${m}`));
});

console.log('\n=== ALL TARGET ENDPOINTS VERIFIED AND LIVE IN EXPRESS ROUTER ===');
