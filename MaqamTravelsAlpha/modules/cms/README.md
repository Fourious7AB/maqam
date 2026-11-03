# 📄 CMS Module (Content Management System)

This module handles static pages, FAQs, blog posts, and the frontend hero banner for the Maqam Travels platform.

## 📁 Directory Structure

```
modules/cms/
├── cms.model.js       # Mongoose Schema & Model for CMSPage (polymorphic content)
├── cms.controller.js  # Controller handling request parsing & standard JSON responses
├── cms.service.js     # Business logic, Cloudinary integration, and cleanup
├── cms.validator.js   # Express-validator schemas for routes & payloads
├── cms.routes.js      # Express router, Swagger OpenAPI docs, and auth guards
└── README.md          # Module overview
```

## 📖 Complete API Documentation

For the full technical reference covering:
- Detailed endpoint specifications
- Request body schemas (`multipart/form-data` & `application/json`)
- Response body JSON payloads
- Error taxonomy & validation rules
- QA/Testing cURL commands

👉 See **[docs/cms/CMS_API_DOCUMENTATION.md](../../docs/cms/CMS_API_DOCUMENTATION.md)**.
