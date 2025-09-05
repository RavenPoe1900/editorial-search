import Joi from "joi";

export default Joi.object({
  page: Joi.number().integer().min(0).example(1),
  limit: Joi.number().integer().min(1).max(250).example(10),
});