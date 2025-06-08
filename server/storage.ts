import { Repository } from "../shared/schema";
import archiver from "archiver";
import { PassThrough } from "stream";

export class Storage {
  async generateRepositoryZip(id: number): Promise<Buffer> {
    // Dummy repository for example
    const repository: Repository = {
      id,
      name: "Sample Repository",
      createdAt: new Date()
    };

    const archive = archiver("zip", { zlib: { level: 9 } });
    const bufferChunks: Uint8Array[] = [];
    const passthrough = new PassThrough();

    passthrough.on("data", (chunk) => bufferChunks.push(chunk));
    archive.on("warning", (err) => { if (err.code !== "ENOENT") throw err; });
    archive.on("error", (err) => { throw err; });

    archive.pipe(passthrough);

    // Example files to include
    archive.append(`# ${repository.name}\nGenerated content`, { name: "README.md" });
    archive.append(`console.log("Hello from repository ${repository.id}");`, { name: "src/index.js" });

    await archive.finalize();

    return Buffer.concat(bufferChunks);
  }
}