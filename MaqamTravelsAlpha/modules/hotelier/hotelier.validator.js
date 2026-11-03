const { body, param } = require('express-validator');

const validateCreateStock = () => [
  body('roomType').trim().notEmpty().withMessage('roomType is required'),
  body('checkIn').isISO8601().toDate().withMessage('Valid checkIn date required'),
  body('checkOut').isISO8601().toDate().withMessage('Valid checkOut date required'),
  body('pricePerNight').isNumeric({ min: 0 }).withMessage('pricePerNight must be a positive number'),
  body('reservationRef').trim().notEmpty().withMessage('reservationRef is required'),
  body('nameAdditionDeadline').isISO8601().toDate().withMessage('Valid nameAdditionDeadline required'),
  body('unitCount').isInt({ min: 1 }).withMessage('unitCount must be an integer >= 1'),
];

const validateUpdateStock = () => [
  param('id').isMongoId().withMessage('Invalid stock batch ID'),
  body('pricePerNight').optional().isNumeric({ min: 0 }).withMessage('pricePerNight must be a positive number'),
  body('checkIn').optional().isISO8601().toDate().withMessage('Valid checkIn date required'),
  body('checkOut').optional().isISO8601().toDate().withMessage('Valid checkOut date required'),
  body('nameAdditionDeadline').optional().isISO8601().toDate().withMessage('Valid nameAdditionDeadline required'),
];

const validateAddUnits = () => [
  param('id').isMongoId().withMessage('Invalid stock batch ID'),
  body('count').isInt({ min: 1 }).withMessage('count must be an integer >= 1'),
];

const validateUpdateUnitStatus = () => [
  param('id').isMongoId().withMessage('Invalid stock batch ID'),
  param('unitId').isMongoId().withMessage('Invalid unit ID'),
  body('status')
    .isIn(['available', 'blocked'])
    .withMessage("Status must be either 'available' or 'blocked'"),
];

const validateUpdateAmenities = () =>[
  body('amenities')
   .isArray({min:1})
   .withMessage('amenities munst be a non-empty array or strings'),

  body('amenities.*')
   .isString()
   .trim()
   .notEmpty()
   .withMessage('amenities must not contain empty strings')
];


module.exports = {
  validateCreateStock,
  validateUpdateStock,
  validateAddUnits,
  validateUpdateUnitStatus,
  validateUpdateAmenities
 
};
