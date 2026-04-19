import { eq, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  repositories, users, downloadLogs, feedbackRequests,
  type InsertRepository, type Repository,
  type InsertFeedbackRequest, type UpsertUser, type InsertDownloadLog,
} from "@shared/schema";
import archiver from "archiver";
import { PassThrough } from "stream";
import { createReadStream, readFileSync, existsSync } from "fs";
import { createGunzip } from "zlib";
import { extract } from "tar";
import { join, resolve } from "path";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync, statSync } from "fs";
import { tmpdir } from "os";

// Map use case IDs to template tarballs
const USE_CASE_TEMPLATES: Record<string, { tarball: string; name: string }> = {
  vector:      { tarball: "pgvector.tar.gz",  name: "pgvector-hybrid-search" },
  geospatial:  { tarball: "postgis.tar.gz",   name: "postgis-property-search" },
  timeseries:  { tarball: "pgroute.tar.gz",   name: "pgroute-transportation" }, // reuse pgroute as base
  multitenant: { tarball: "pgvector.tar.gz",  name: "multitenant-saas" },
  analytics:   { tarball: "postgis.tar.gz",   name: "analytics-dashboard" },
  ha:          { tarball: "pgvector.tar.gz",  name: "high-availability" },
};

function getTemplatesDir(): string {
  const candidates = [
    resolve("/app", "server", "templates"),
    resolve(process.cwd(), "server", "templates"),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  throw new Error("Templates directory not found. Searched: " + candidates.join(", "));
}

export class Storage {
  // ── Repositories ──
  async createRepository(data: InsertRepository): Promise<Repository> {
    const [repo] = await db.insert(repositories).values(data).returning();
    return repo;
  }

  async getRepository(id: number): Promise<Repository | undefined> {
    return db.query.repositories.findFirst({ where: eq(repositories.id, id) });
  }

  async listRepositories(): Promise<Repository[]> {
    return db.select().from(repositories).orderBy(desc(repositories.createdAt));
  }

  async updateRepositoryStatus(id: number, status: string, progress: number) {
    await db.update(repositories).set({ status, progress }).where(eq(repositories.id, id));
  }

  // ── Users ──
  async upsertUser(data: UpsertUser) {
    const [user] = await db
      .insert(users)
      .values({ ...data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: users.id, set: { updatedAt: new Date() } })
      .returning();
    return user;
  }

  async getUser(id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  }

  // ── Download Logs ──
  async logDownload(data: InsertDownloadLog) {
    await db.insert(downloadLogs).values(data);
  }

  // ── Feedback ──
  async createFeedback(data: InsertFeedbackRequest) {
    const [fb] = await db.insert(feedbackRequests).values(data).returning();
    return fb;
  }

  async listFeedback() {
    return db.select().from(feedbackRequests).orderBy(desc(feedbackRequests.createdAt));
  }

  // ── Analytics ──
  async getAnalytics() {
    const totalDownloads = await db.select({ count: sql<number>`count(*)` }).from(downloadLogs);
    const uniqueUsers = await db.select({ count: sql<number>`count(distinct ${downloadLogs.userId})` }).from(downloadLogs);
    const topUseCases = await db
      .select({ useCase: downloadLogs.useCase, count: sql<number>`count(*)` })
      .from(downloadLogs)
      .groupBy(downloadLogs.useCase)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
    const topLanguages = await db
      .select({ language: downloadLogs.language, count: sql<number>`count(*)` })
      .from(downloadLogs)
      .groupBy(downloadLogs.language)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
    const feedbackCount = await db.select({ count: sql<number>`count(*)` }).from(feedbackRequests);

    return {
      totalDownloads: totalDownloads[0]?.count ?? 0,
      uniqueUsers: uniqueUsers[0]?.count ?? 0,
      topUseCases,
      topLanguages,
      feedbackCount: feedbackCount[0]?.count ?? 0,
    };
  }

  // ── ZIP Generation from real templates ──
  async generateRepositoryZip(id: number): Promise<Buffer> {
    const repo = await this.getRepository(id);
    if (!repo) throw new Error("Repository not found");

    const useCases = (repo.useCases as string[]) || ["vector"];
    const primaryUseCase = useCases[0];
    const template = USE_CASE_TEMPLATES[primaryUseCase] || USE_CASE_TEMPLATES.vector;
    const templatesDir = getTemplatesDir();
    const tarballPath = join(templatesDir, template.tarball);

    if (!existsSync(tarballPath)) {
      console.error(`Template not found: ${tarballPath}, templates dir: ${templatesDir}`);
      // Fallback to basic ZIP
      return this.generateBasicZip(repo);
    }

    // Extract tarball to temp dir
    const tmpDir = mkdtempSync(join(tmpdir(), "demo-gen-"));
    try {
      await new Promise<void>((resolve, reject) => {
        createReadStream(tarballPath)
          .pipe(createGunzip())
          .pipe(extract({ cwd: tmpDir }))
          .on("finish", resolve)
          .on("error", reject);
      });

      // Customize the extracted files
      this.customizeTemplate(tmpDir, repo);

      // Create ZIP from the customized directory
      const archive = archiver("zip", { zlib: { level: 9 } });
      const chunks: Uint8Array[] = [];
      const passthrough = new PassThrough();
      passthrough.on("data", (chunk) => chunks.push(chunk));
      archive.on("error", (err) => { throw err; });
      archive.pipe(passthrough);

      // Recursively add all files
      this.addDirectoryToArchive(archive, tmpDir, "");

      await archive.finalize();
      return Buffer.concat(chunks);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private customizeTemplate(dir: string, repo: Repository) {
    const repoName = repo.name;
    const region = repo.awsRegion || "us-east-2";
    const instanceType = repo.instanceType || "db.t3.medium";
    const pgVersion = repo.databaseVersion || "16";
    const dbType = repo.databaseType || "RDS";

    // Update parameters.json
    const paramsPath = join(dir, "cloudformation", "parameters.json");
    if (existsSync(paramsPath)) {
      const params = JSON.parse(readFileSync(paramsPath, "utf-8"));
      params.ProjectName = repoName;
      params.PostgreSQLVersion = pgVersion.includes(".") ? pgVersion : pgVersion + ".6";
      // Aurora requires minimum db.t4g.medium
      const auroraCompatible = instanceType.includes("micro") ? "db.t4g.medium" : instanceType;
      params.DatabaseInstanceType = dbType === "Aurora" ? auroraCompatible : instanceType;
      writeFileSync(paramsPath, JSON.stringify(params, null, 2));
    }

    // Update pyproject.toml
    const pyprojectPath = join(dir, "pyproject.toml");
    if (existsSync(pyprojectPath)) {
      writeFileSync(pyprojectPath, `[project]\nname = "${repoName}"\nversion = "1.0.0"\n`);
    }

    // Prepend config info to README
    const readmePath = join(dir, "README.md");
    if (existsSync(readmePath)) {
      const original = readFileSync(readmePath, "utf-8");
      const header = `# ${repoName}\n\n` +
        `> Generated by [Cloud Demo Generator](https://github.com/aws-samples/cloud-demo-generator-v3)\n\n` +
        `| Setting | Value |\n|---------|-------|\n` +
        `| Database Type | ${dbType} |\n` +
        `| PostgreSQL Version | ${pgVersion} |\n` +
        `| Instance Type | ${instanceType} |\n` +
        `| AWS Region | ${region} |\n` +
        `| Use Cases | ${(repo.useCases as string[]).join(", ")} |\n` +
        `| Complexity | ${repo.complexityLevel} |\n\n---\n\n`;
      // Replace the first heading with our customized one
      const withoutFirstHeading = original.replace(/^#\s+.*\n/, "");
      writeFileSync(readmePath, header + withoutFirstHeading);
    }

    // Update deploy.sh region
    const deployPath = join(dir, "deploy.sh");
    if (existsSync(deployPath)) {
      let deploy = readFileSync(deployPath, "utf-8");
      deploy = deploy.replace(/AWS_REGION="[^"]*"/g, `AWS_REGION="${region}"`);
      deploy = deploy.replace(/STACK_NAME="[^"]*"/g, `STACK_NAME="${repoName}"`);
      writeFileSync(deployPath, deploy);
    }
  }

  private addDirectoryToArchive(archive: archiver.Archiver, dirPath: string, prefix: string) {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const archivePath = prefix ? `${prefix}/${entry}` : entry;
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        this.addDirectoryToArchive(archive, fullPath, archivePath);
      } else {
        archive.file(fullPath, { name: archivePath });
      }
    }
  }

  private async generateBasicZip(repo: Repository): Promise<Buffer> {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Uint8Array[] = [];
    const passthrough = new PassThrough();
    passthrough.on("data", (chunk) => chunks.push(chunk));
    archive.on("error", (err) => { throw err; });
    archive.pipe(passthrough);

    archive.append(`# ${repo.name}\n\nGenerated by Cloud Demo Generator v3\n`, { name: "README.md" });
    archive.append(`print("Hello from ${repo.name}")`, { name: "app.py" });
    archive.append(JSON.stringify({ ProjectName: repo.name, PostgreSQLVersion: repo.databaseVersion }, null, 2), { name: "cloudformation/parameters.json" });

    await archive.finalize();
    return Buffer.concat(chunks);
  }
}
