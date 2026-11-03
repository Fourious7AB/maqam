const sendSuccess = (
  res,
  { message = "Success", data = null, meta = null, statusCode = 200 } = {},
) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

const sendError = (
  res,
  {
    message = "Something went wrong",
    errors = null,
    statusCode = 500,
    error = null,
    details = null,
  } = {},
) => {
  const response = { success: false, message };
  if (error !== null) response.error = error;
  if (errors !== null) response.errors = errors;
  if (details !== null) response.details = details;
  return res.status(statusCode).json(response);
};

const sendCreated = (res, data, message = "Created successfully") =>
  sendSuccess(res, { message, data, statusCode: 201 });

const sendNotFound = (res, message = "Resource not found") =>
  sendError(res, { message, statusCode: 404 });

const sendUnauthorized = (res, message = "Unauthorized") =>
  sendError(res, { message, statusCode: 401 });

const sendForbidden = (res, message = "Forbidden") =>
  sendError(res, { message, statusCode: 403 });

const sendBadRequest = (res, message = "Bad request", errors = null) =>
  sendError(res, { message, errors, statusCode: 400 });

// Paginated response — wraps data with page info
const sendPaginated = (
  res,
  { data, total, page, limit, message = "Success" },
) =>
  sendSuccess(res, {
    message,
    data,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  });

module.exports = {
  sendSuccess,
  sendError,
  sendCreated,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendBadRequest,
  sendPaginated,
};
