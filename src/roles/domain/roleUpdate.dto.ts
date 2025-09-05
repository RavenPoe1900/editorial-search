import Joi from "joi";
import RoleTypeEnum from "../../_shared/enum/roles.enum";

export default Joi.object({
  name: Joi.string()
    .optional()
    .valid(RoleTypeEnum.ADMIN, RoleTypeEnum.MANAGER, RoleTypeEnum.EMPLOYEE)
    .messages({
      "string.empty": "Name cannot be empty",
      "any.only": `Name must be one of ${RoleTypeEnum.ADMIN}, ${RoleTypeEnum.MANAGER}, ${RoleTypeEnum.EMPLOYEE}`,
    }),
});