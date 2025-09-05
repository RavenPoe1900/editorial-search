import chalk from "chalk";
import config from "../config/config";

export const logger = (text: string, info: string = "INFO:", color: keyof typeof chalk = "green" as any) => {
  const dateTime = new Date().toJSON().slice(0, 19).replace("T", ":");
  const c: any = chalk;
  console.log(
    ` ${c["green"]("[express]")} ${c.yellow(`[${dateTime}]`)} ${c[color](info)} ${c.bgBlue(text)}`
  );
};

export const printEndpoints = (path: string, methods: string[] | string) => {
  logger(`[RouterExplorer] Mapped {${path}, ${methods}} route`, "INFO:", "green" as any);
};