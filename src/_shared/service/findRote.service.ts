import fs from "fs";
import path from "path";

const findRoutes = (dir: string, folderName: string, fileName: string): string[] => {
  const results: string[] = [];

  const exploreDirectory = (currentDir: string) => {
    try {
      const list = fs.readdirSync(currentDir);
      list.forEach((file) => {
        const filePath = path.resolve(currentDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          if (file === folderName) {
            const infraFiles = fs.readdirSync(filePath);
            infraFiles.forEach((infraFile) => {
              if (infraFile.endsWith(fileName.replace(".js", ".ts"))) {
                results.push(path.resolve(filePath, infraFile));
              }
            });
          } else {
            exploreDirectory(filePath);
          }
        }
      });
    } catch (err) {
      console.error(`Error reading directory ${currentDir}:`, err);
    }
  };

  exploreDirectory(dir);
  return results;
};

export default findRoutes;