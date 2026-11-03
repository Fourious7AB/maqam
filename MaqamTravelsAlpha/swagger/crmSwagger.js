const swaggerJSDoc = require('swagger-jsdoc');

const servers = [
  {
    url: '/',
    description: 'Current Host (Dynamic)',
  },
];
if (process.env.NODE_ENV === 'production') {
  servers.push({
    url: process.env.API_URL || '/maqam',
    description: 'Production API Gateway',
  });
} else if (process.env.NODE_ENV === 'staging') {
  servers.push({
    url: process.env.API_URL || '/maqam',
    description: 'Staging API Server',
  });
} else {
  servers.push({
    url: `http://localhost:${process.env.PORT || 5000}`,
    description: 'Local Development Server',
  });
}

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MaqamTravels CRM API Documentation',
      version: '1.0.0',
      description: `
## CRM Operations & Management API Reference
Welcome to the MaqamTravels dedicated **CRM Platform Documentation**.
This documentation contains **only CRM site routes**: Leads, Pipeline & Stats, CRM Hotels, CRM Staff/Users, Hotel Stock Approvals, Admin Packages, Admin Stocks, and Admin Offers.

### Authentication
All CRM endpoints require authorization through Bearer JWT with \`admin\`, \`super_admin\`, or \`sales_agent\` roles.
Use the **Authorize** button below to provide your token.
      `,
      contact: {
        name: 'MaqamTravels CRM Dev Team',
        email: 'crm-support@maqamtravels.com',
      },
    },
    servers,
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  // Scans strictly CRM site routes and shared components
  apis: [
    './swagger/components/*.yaml',
    './swagger/components/**/*.yaml',
    './modules/crm/**/*.js',
    './modules/bookings/crm/**/*.js',
    './modules/packages/admin/**/*.js',
    './modules/packages/stock/**/*.js',
    './modules/packages/offers/offerAdmin.routes.js',
    './modules/quotes/quoteAdmin.routes.js',
    './modules/invoices/adminInvoice.routes.js',
  ],
};

const crmSwaggerSpec = swaggerJSDoc(options);

module.exports = crmSwaggerSpec;
