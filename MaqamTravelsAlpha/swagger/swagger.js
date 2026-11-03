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
      title: 'MaqamTravels API Platform',
      version: '1.0.0',
      description: `
## Enterprise API Reference
Welcome to the MaqamTravels API documentation. 
This reference lists all routes, models, authentication policies, and response envelopes.

### Authentication
Secure endpoints require authorization through Bearer JWT. 
Select the **Authorize** lock button below and supply your token.
      `,
      contact: {
        name: 'MaqamTravels Dev Team',
        email: 'api-support@maqamtravels.com',
      },
    },
    servers,
    // Add global security requirement (optional, can be overridden per route)
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  // Globs targeting reusable YAML files and JSDoc decorated routes (excluding CRM)
  apis: [
    './swagger/components/*.yaml',
    './swagger/components/**/*.yaml',
    './app.js',
    './modules/!(insurance|guide|crm)/**/*.js',
    './routes/**/*.js',
  ],
};

const swaggerSpec = swaggerJSDoc(options);

// Filter out CRM endpoints from the Main Platform Swagger UI
if (swaggerSpec.paths) {
  swaggerSpec.paths = Object.fromEntries(
    Object.entries(swaggerSpec.paths).filter(([path]) => {
      return !path.startsWith('/api/v1/crm') && !path.startsWith('/api/v1/ops-crm') && !path.startsWith('/api/v1/invoices/admin');
    })
  );
}

module.exports = swaggerSpec;

