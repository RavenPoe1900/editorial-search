const StateTypeEnum = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type StateType = typeof StateTypeEnum[keyof typeof StateTypeEnum];
export default StateTypeEnum;