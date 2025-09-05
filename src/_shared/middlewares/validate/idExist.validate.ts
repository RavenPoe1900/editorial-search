export default (modelService: any, message: string) => {
  return async (value: string, helpers: any) => {
    try {
      if (!value) return true;
      const res = await modelService.findById(value);
      if (!res || res.status !== 200 || !res.data) {
        return helpers.message(message);
      }
      return true;
    } catch (error) {
      console.error("idExist.validate error:", error);
      return helpers.message(message);
    }
  };
};