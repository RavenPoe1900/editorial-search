const TypeTypeEnum = {
  PARTIAL: "partial",
  FINAL: "final",
  TEST: "test",
} as const;

export type TypeType = typeof TypeTypeEnum[keyof typeof TypeTypeEnum];
export default TypeTypeEnum;