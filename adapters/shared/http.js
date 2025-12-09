export const createPostHandler = ({
  schema,
  execute,
  buildResponse,
  status = 201,
  onError,
}) => {
  if (typeof onError !== 'function') {
    throw new Error('createPostHandler requires an onError handler');
  }

  return async (req, res) => {
    try {
      const data = schema.parse(req.body);
      const result = await execute(data);
      res.status(status).json(buildResponse(result, data));
    } catch (error) {
      onError(error, req, res);
    }
  };
};
