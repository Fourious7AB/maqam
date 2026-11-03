const { body, param } = require('express-validator');

/**
 * ─── CMS VALIDATORS ───────────────────────────────────
 * Validators for CMS endpoints
 */

const validatePageSlug = () => [
  param('slug')
    .trim()
    .notEmpty()
    .withMessage('Page slug is required'),
];

const validateCreatePage = () => [
  body('type')
    .isIn(['page', 'faq', 'blog'])
    .withMessage('Invalid page type'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),
  body('slug')
    .trim()
    .notEmpty()
    .withMessage('Slug is required'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
];

const validateUpdatePage = () => [
  param('pageId')
    .isMongoId()
    .withMessage('Invalid page ID'),
];

const validateChangeHeroPic = () => [
  body('imageUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('imageUrl must be a valid URL'),
  body('title')
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage('Title must be a string')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('subTitle')
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage('subTitle must be a string')
    .isLength({ max: 500 })
    .withMessage('subTitle cannot exceed 500 characters'),
  body().custom((_, { req }) => {
    const hasFile = Boolean(req.file && req.file.buffer);
    const hasImageUrl = Boolean(req.body && typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim().length > 0);

    if (!hasFile && !hasImageUrl) {
      throw new Error('Please provide an image file (heroPic) or an imageUrl');
    }
    return true;
  }),
];

const validateEditHeroPic = () => [
  body('imageUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('imageUrl must be a valid URL'),
  body('title')
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage('Title must be a string')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('subTitle')
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage('subTitle must be a string')
    .isLength({ max: 500 })
    .withMessage('subTitle cannot exceed 500 characters'),
  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean')
    .toBoolean(),
];

module.exports = {
  validatePageSlug,
  validateCreatePage,
  validateUpdatePage,
  validateChangeHeroPic,
  validateEditHeroPic,
};

