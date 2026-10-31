import { safeStorage } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import type { State, Store } from "./service";
import { readBounded } from "./files";
export function protectedStore(directory: string): Store {
  const file = path.join(directory, "license-state.dpapi");
  return {
    async read() {
      let handle;
      try {
        handle = await fs.open(file, "r");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
      try {
        if (!(await safeStorage.isAsyncEncryptionAvailable()))
          throw Error("Protected storage unavailable");
        return JSON.parse(
          (
            await safeStorage.decryptStringAsync(
              await readBounded(handle, 65536),
            )
          ).result,
        );
      } finally {
        await handle.close();
      }
    },
    async write(state: State) {
      if (
        process.platform !== "win32" ||
        !(await safeStorage.isAsyncEncryptionAvailable())
      )
        throw Error("Windows protected storage required");
      const bytes = await safeStorage.encryptStringAsync(JSON.stringify(state));
      await fs.mkdir(directory, { recursive: true });
      const temporary = file + ".tmp";
      const handle = await fs.open(temporary, "w", 0o600);
      try {
        await handle.writeFile(bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.rename(temporary, file);
    },
  };
}
