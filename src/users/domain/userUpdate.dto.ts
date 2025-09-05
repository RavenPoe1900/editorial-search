import Joi from "joi";
import validateIdExistence from "../../_shared/middlewares/validate/idExist.validate";
import RoleService from "../../roles/application/role.service";

const roleMessage = "Role id not exist";

export default Joi.object({
  name: Joi.string().optional().min(3),
  email: Joi.string().optional().email(),
  password: Joi.string().optional().min(6),
  role: Joi.string().optional().length(24).external(validateIdExistence(RoleService, roleMessage)),
});