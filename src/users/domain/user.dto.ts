import Joi from "joi";
import validateIdExistence from "../../_shared/middlewares/validate/idExist.validate";
import RoleService from "../../roles/application/role.service";

const message = "Role id not exist";

export default Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().length(24).external(validateIdExistence(RoleService, message)).required(),
});