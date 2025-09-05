import Joi from "joi";
import RoleTypeEnum from "../../_shared/enum/roles.enum";

export default Joi.object({
  name: Joi.string()
    .valid(RoleTypeEnum.ADMIN, RoleTypeEnum.MANAGER, RoleTypeEnum.EMPLOYEE)
    .required()
    .messages({
      "string.empty": "Name is required",
      "any.only": `Name must be one of ${RoleTypeEnum.ADMIN}, ${RoleTypeEnum.MANAGER}, ${RoleTypeEnum.EMPLOYEE}`,
    }),
});