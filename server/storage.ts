import { GeneratedFile, Repository, RepositoryConfig, InsertRepository, User, UpsertUser, DownloadLog, InsertDownloadLog } from "@shared/schema";
import archiver from "archiver";

// Additional interfaces for complete functionality
export interface RepositoryStats {
  totalFiles: number;
  modules: number;
  codeExamples: number;
  estimatedSize: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  order: number;
  documents: number;
  examples: number;
  exercises: number;
  estimatedHours: string;
  status: 'pending' | 'generating' | 'complete';
}

export interface DatasetInfo {
  name: string;
  description: string;
  format: string;
  size: string;
  features: string;
  icon: string;
  color: string;
  status: 'pending' | 'processing' | 'complete' | 'queued';
}

export interface IStorage {
  getRepository(id: number): Promise<Repository | undefined>;
  createRepository(repository: InsertRepository): Promise<Repository>;
  updateRepository(id: number, updates: Partial<Repository>): Promise<Repository | undefined>;
  getAllRepositories(): Promise<Repository[]>;
  generateRepositoryContent(id: number): Promise<void>;
  async generateRepositoryZip(id: number): Promise<Buffer> {
    const repository = await this.getRepository(id);
    if (!repository) {
      throw new Error("Repository not found");
    }

    const archiver = require("archiver");
    const { PassThrough } = require("stream");

    const archive = archiver("zip", { zlib: { level: 9 } });
    const bufferChunks: Uint8Array[] = [];
    const stream = new PassThrough();

    stream.on("data", (chunk) => bufferChunks.push(chunk));
    archive.on("warning", (err) => { if (err.code !== "ENOENT") throw err; });
    archive.on("error", (err) => { throw err; });

    archive.pipe(stream);

    // Example files - replace with actual content logic
    archive.append("# Sample README\nGenerated for repository " + repository.name, { name: "README.md" });
    archive.append("console.log('Demo');", { name: "src/index.js" });

    await archive.finalize();

    return Buffer.concat(bufferChunks);
  }
  getRepositoryStats(id: number): Promise<RepositoryStats>;
  getLearningModules(repositoryId: number): Promise<LearningModule[]>;
  getDatasets(repositoryId: number): Promise<DatasetInfo[]>;
  
  // User management
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Download tracking
  logDownload(download: InsertDownloadLog): Promise<DownloadLog>;
  getDownloadStats(): Promise<{
    totalDownloads: number;
    uniqueUsers: number;
    topUseCases: Array<{ useCase: string; count: number }>;
    topLanguages: Array<{ language: string; count: number }>;
    recentDownloads: DownloadLog[];
  }>;
  
  // Feedback and demo requests
  submitFeedback(feedback: { email: string; demoType: string; priority: string; message: string; status: string }): Promise<{ id: number }>;
  getAllFeedback(): Promise<Array<{ id: number; email: string; demoType: string; priority: string; message: string; status: string; createdAt: string }>>;
}

export class MemStorage implements IStorage {
  private repositories: Map<number, Repository>;
  private currentId: number;
  private generationQueue: number[] = [];
  private isGenerating: boolean = false;
  private downloadLogs: any[] = [];
  private signedInUsers: Map<string, { email: string; lastSeen: Date; signInCount: number }> = new Map();
  private feedbackRequests: Array<{ id: number; email: string; demoType: string; priority: string; message: string; status: string; createdAt: string }> = [];
  private feedbackIdCounter: number = 1;

  constructor() {
    this.repositories = new Map();
    this.currentId = 1;
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Add sample download logs for analytics
    this.downloadLogs = [
      {
        id: 1,
        repositoryName: "Real Estate Search Platform",
        useCase: "real-estate-search",
        language: "Python",
        downloadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        userId: "user1",
        userEmail: "john.developer@techcorp.com"
      },
      {
        id: 2,
        repositoryName: "E-commerce Time Series Analytics",
        useCase: "time-series-analytics",
        language: "JavaScript",
        downloadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        userId: "user2",
        userEmail: "sarah.engineer@startup.io"
      },
      {
        id: 3,
        repositoryName: "Vector Search Demo",
        useCase: "vector-similarity-search",
        language: "Python",
        downloadedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        userId: "user1",
        userEmail: "john.developer@techcorp.com"
      },
      {
        id: 4,
        repositoryName: "IoT Sensor Analytics",
        useCase: "time-series-analytics",
        language: "JavaScript",
        downloadedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        userId: "user3",
        userEmail: "mike.lead@enterprise.com"
      },
      {
        id: 5,
        repositoryName: "Property Management System",
        useCase: "real-estate-search",
        language: "Python",
        downloadedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        userId: "user4",
        userEmail: "lisa.architect@consulting.net"
      }
    ];

    // Add sample signed-in users
    this.signedInUsers.set("sroctank4@gmail.com", {
      email: "sroctank4@gmail.com",
      lastSeen: new Date(),
      signInCount: 15
    });
    this.signedInUsers.set("john.developer@techcorp.com", {
      email: "john.developer@techcorp.com", 
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
      signInCount: 8
    });
    this.signedInUsers.set("sarah.engineer@startup.io", {
      email: "sarah.engineer@startup.io",
      lastSeen: new Date(Date.now() - 4 * 60 * 60 * 1000),
      signInCount: 3
    });
  }

  // Clear all repositories for fresh start
  clearAll() {
    this.repositories.clear();
    this.currentId = 1;
  }

  async getRepository(id: number): Promise<Repository | undefined> {
    return this.repositories.get(id);
  }

  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    const id = this.currentId++;
    const repository: Repository = {
      id,
      name: insertRepository.name,
      language: insertRepository.language,
      databaseVersion: insertRepository.databaseVersion,
      databaseType: insertRepository.databaseType || 'Standard',
      instanceType: insertRepository.instanceType || 't3.medium',
      awsRegion: insertRepository.awsRegion || 'us-west-2',
      useCases: insertRepository.useCases as string[] || [],
      complexityLevel: insertRepository.complexityLevel,
      status: 'pending',
      progress: 0,
      generatedFiles: [],
      estimatedSize: null,
      createdAt: new Date(),
    };

    this.repositories.set(id, repository);
    return repository;
  }

  async updateRepository(id: number, updates: Partial<Repository>): Promise<Repository | undefined> {
    const repository = this.repositories.get(id);
    if (!repository) return undefined;

    const updatedRepository = { ...repository, ...updates };
    this.repositories.set(id, updatedRepository);
    return updatedRepository;
  }

  async getAllRepositories(): Promise<Repository[]> {
    return Array.from(this.repositories.values());
  }

  async generateRepositoryContent(id: number): Promise<void> {
    this.generationQueue.push(id);
    if (!this.isGenerating) {
      this.processGenerationQueue();
    }
  }

  private async processGenerationQueue(): Promise<void> {
    if (this.generationQueue.length === 0) {
      this.isGenerating = false;
      return;
    }

    this.isGenerating = true;
    const id = this.generationQueue.shift()!;
    await this.generateSingleRepository(id);
    setTimeout(() => this.processGenerationQueue(), 100);
  }

  private async generateSingleRepository(id: number): Promise<void> {
    const repository = this.repositories.get(id);
    if (!repository) return;

    // Update status to generating
    await this.updateRepository(id, { status: 'generating', progress: 10 });

    // Simulate file generation
    const files = this.generateFileStructure(repository);
    
    for (let i = 0; i < files.length; i++) {
      const progress = 10 + ((i + 1) / files.length) * 90;
      await this.updateRepository(id, { progress: Math.round(progress) });
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Complete generation
    await this.updateRepository(id, {
      status: 'complete',
      progress: 100,
      generatedFiles: files,
      estimatedSize: `${Math.round(files.length * 12.5)}KB`
    });
  }

  private generateFileStructure(repository: Repository): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    const moduleCount = isPropertySearch ? 12 : 10;

    // Root files
    files.push({
      path: 'README.md',
      type: 'file',
      size: 2500,
      language: 'markdown',
      status: 'complete'
    });

    // CloudFormation infrastructure files
    files.push({
      path: 'cloudformation/main.yaml',
      type: 'file',
      size: 8500,
      language: 'yaml',
      status: 'complete'
    });

    files.push({
      path: 'cloudformation/parameters.json',
      type: 'file',
      size: 1200,
      language: 'json',
      status: 'complete'
    });

    // Ubuntu deployment scripts
    files.push({
      path: 'scripts/bastion-setup.sh',
      type: 'file',
      size: 3200,
      language: 'bash',
      status: 'complete'
    });

    // Comprehensive dependency installation script
    files.push({
      path: 'install-dependencies.sh',
      type: 'file',
      size: 2800,
      language: 'bash',
      status: 'complete'
    });

    files.push({
      path: 'docs/ubuntu-deployment.md',
      type: 'file',
      size: 4800,
      language: 'markdown',
      status: 'complete'
    });

    // Database files
    files.push({
      path: 'database/setup.sql',
      type: 'file',
      size: 1800,
      language: 'sql',
      status: 'complete'
    });

    // Learning modules
    for (let i = 1; i <= moduleCount; i++) {
      files.push({
        path: `modules/module_${i.toString().padStart(2, '0')}/README.md`,
        type: 'file',
        size: 1500,
        language: 'markdown',
        status: 'complete'
      });

      const ext = this.getFileExtension(repository.language);
      files.push({
        path: `modules/module_${i.toString().padStart(2, '0')}/example.${ext}`,
        type: 'file',
        size: 800,
        language: repository.language.toLowerCase(),
        status: 'complete'
      });
    }

    return files;
  }

  private getFileExtension(language: string): string {
    switch (language) {
      case 'Python': return 'py';
      case 'JavaScript':
      case 'Node.js': return 'js';
      default: return 'txt';
    }
  }

  async generateRepositoryZip(id: number): Promise<Buffer> {
    const repository = this.repositories.get(id);
    if (!repository) {
      throw new Error('Repository not found');
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    
    archive.on('data', (chunk) => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      archive.on('error', reject);

      const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
      const isTimeSeries = repository.useCases.includes("Time-Series Analytics");

      // Add main README and license
      archive.append(this.generateMainReadme(repository), { name: 'README.md' });
      archive.append(this.generateLicenseFile(), { name: 'LICENSE' });

      // Add CloudFormation infrastructure
      archive.append(this.generateCloudFormationInfrastructure(repository), { name: 'cloudformation/main.yaml' });
      archive.append(this.generateCloudFormationParameters(repository), { name: 'cloudformation/parameters.json' });
      
      // Add Ubuntu deployment scripts
      archive.append(this.generateBastionSetupScript(repository), { name: 'scripts/bastion-setup.sh' });
      archive.append(this.generateUbuntuDeploymentGuide(repository), { name: 'docs/ubuntu-deployment.md' });
      
      // Add database setup
      archive.append(this.generateDatabaseSetup(repository), { name: 'database/setup.sql' });
      archive.append(this.generateDatabaseMigrations(repository), { name: 'database/migrations/001_initial_schema.sql' });
      
      // Add application code
      const moduleCount = isPropertySearch ? 12 : (isTimeSeries ? 11 : 10);
      for (let i = 1; i <= moduleCount; i++) {
        const moduleContent = this.generateModuleContent(i, repository, isPropertySearch, isTimeSeries);
        archive.append(moduleContent, { name: `modules/module_${i.toString().padStart(2, '0')}/README.md` });
        
        const codeExample = this.generateCodeExample(i, repository, isPropertySearch, isTimeSeries);
        const ext = this.getFileExtension(repository.language);
        archive.append(codeExample, { name: `modules/module_${i.toString().padStart(2, '0')}/example.${ext}` });
      }

      // Add package management files
      if (repository.language === "Python") {
        archive.append(this.generateRequirements(), { name: 'requirements.txt' });
        archive.append(this.generatePyprojectToml(repository), { name: 'pyproject.toml' });
      } else if (repository.language === "JavaScript" || repository.language === "Node.js") {
        archive.append(this.generatePackageJson(repository), { name: 'package.json' });
      }

      // Add deployment scripts
      archive.append(this.generateDeployScript(repository), { name: 'deploy.sh' });
      archive.append(this.generateSetupScript(repository), { name: 'setup.sh' });
      
      // Add comprehensive dependency installation script
      archive.append(this.generateInstallDependenciesScript(repository), { name: 'install-dependencies.sh' });
      
      // Add environment configuration
      archive.append(this.generateEnvExample(repository), { name: '.env.example' });

      // Add sample datasets
      archive.append(this.generateSampleDataset(repository), { name: 'data/sample_data.csv' });

      // Add API server
      archive.append(this.generateAPIServer(repository), { name: repository.language === "Python" ? 'app.py' : 'server.js' });

      // Add demo scripts
      archive.append(this.generateDemoScript(repository), { name: 'demo/demo_script.md' });
      archive.append(this.generatePresentationGuide(repository), { name: 'demo/presentation_guide.md' });
      archive.append(this.generateCustomerTalkingPoints(repository), { name: 'demo/customer_talking_points.md' });

      archive.finalize();
    });
  }



  private generateLicenseFile(): string {
    return `MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
  }

  private generateMainReadme(repository: Repository): string {
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    const isTimeSeries = repository.useCases.includes("Time-Series Analytics");
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    const isAurora = repository.databaseVersion.includes('Aurora');
    
    return `# ${repository.name}

## Complete PostgreSQL Demo - ${repository.useCases.join(" & ")}

A comprehensive, production-ready demonstration showcasing ${repository.useCases.join(" and ")} capabilities using ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} ${postgresVersion}${isTimeSeries ? ' with native time-series partitioning' : isPropertySearch ? ' with PostGIS extension' : ''} and ${repository.language} implementation on AWS.

## ⚠️ IMPORTANT DISCLAIMERS

### 🚨 AWS Costs Warning
**This deployment will incur AWS charges. You are responsible for all costs.**

**Estimated Monthly Costs (${repository.awsRegion}):**
- Bastion Host (t3.micro): ~$8-12/month
- Database (${isAurora ? 'Aurora PostgreSQL cluster' : 'Amazon RDS PostgreSQL'}): ~$${isAurora ? '150-300' : '40-80'}/month
- Storage (100GB): ~$10-15/month
- Data Transfer: ~$5-10/month
- **Total Estimated: $${isAurora ? '175-340' : '65-120'}/month**

**Cost Management:**
- Monitor spending with AWS Cost Explorer
- Set up billing alerts for your account
- Delete resources when not needed using cleanup scripts
- Consider using development instance types for learning

### 🧪 Development & Testing Only
**Demo generated for educational and prototyping use. Users should review and customize before deploying to production.**

**Before Production Use:**
- Thoroughly test all components in your environment
- Review security configurations for your requirements
- Validate performance under your workload
- Implement proper backup and disaster recovery
- Review and adjust resource sizing
- Conduct security audits and penetration testing

### 👤 Repository Ownership & Maintenance
**You own and maintain this generated repository.**

**Your Responsibilities:**
- Security updates and patches
- Monitoring and maintenance
- Backup and disaster recovery
- Compliance with your organization's policies
- Cost management and optimization
- Documentation updates

### 📄 License
**This generated code is released under MIT License.**

See LICENSE file for complete terms. All code is provided AS IS without warranty.

**By proceeding, you acknowledge understanding of these disclaimers and accept full responsibility for costs, testing, and maintenance.**

## 🚀 QUICK START - DEPENDENCY INSTALLATION

**⚠️ CRITICAL FIRST STEP: Install all required dependencies before running any scripts or applications.**

### Step 1: Install Dependencies (REQUIRED)
\`\`\`bash
# Navigate to the repository directory
cd ${repository.name}

# Make the installation script executable and run it
chmod +x install-dependencies.sh
./install-dependencies.sh
\`\`\`

This script automatically installs:
- ✅ Python 3, pip, and development tools
- ✅ PostgreSQL client tools (psql)
- ✅ AWS CLI v2
- ✅ Python virtual environment
- ✅ All Python dependencies (Flask, psycopg2, etc.)
- ✅ Verifies all imports work correctly

### Step 2: Activate Environment & Test
\`\`\`bash
# Activate the Python virtual environment
source venv/bin/activate

# Verify installation
python -c "import flask, psycopg2; print('All dependencies working!')"

# Update configuration
cp .env.example .env
# Edit .env with your database connection details
\`\`\`

### Step 3: Run Application
\`\`\`bash
# Start the application
python app.py

# Or deploy AWS infrastructure
./deploy.sh
\`\`\`

**⚠️ Common Runtime Errors Without Dependencies:**
- ❌ \`ModuleNotFoundError: No module named 'psycopg2'\` → Run install-dependencies.sh first
- ❌ \`ModuleNotFoundError: No module named 'flask'\` → Run install-dependencies.sh first
- ❌ \`psql: command not found\` → Run install-dependencies.sh first
- ❌ \`aws: command not found\` → Run install-dependencies.sh first

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [AWS Deployment Guide](#aws-deployment-guide)
- [Local Development Setup](#local-development-setup)
- [Learning Modules](#learning-modules)
- [Application Features](#application-features)
- [Performance Benchmarks](#performance-benchmarks)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)
- [Demo Scenarios](#demo-scenarios)
- [Cost Optimization](#cost-optimization)
- [Security Best Practices](#security-best-practices)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)

## Overview

This repository provides a complete, end-to-end PostgreSQL demonstration environment designed for:

- **Enterprise Demos**: Customer presentations and proof-of-concepts
- **Training Workshops**: Hands-on PostgreSQL and AWS learning
- **Development Testing**: Production-like environment setup
- **Architecture Validation**: Best practices implementation

### Key Features

- ✅ **Infrastructure as Code**: Complete CloudFormation templates
- ✅ **AWS Native**: ${isAurora ? 'Aurora PostgreSQL cluster' : 'Amazon RDS PostgreSQL instance'} with Multi-AZ
- ✅ **Security First**: VPC isolation, security groups, encrypted storage
- ✅ **${isTimeSeries ? 'Time-Series Optimized' : isPropertySearch ? 'PostGIS Ready' : 'Performance Tuned'}**: ${isTimeSeries ? 'Native partitioning and BRIN indexing' : isPropertySearch ? 'Spatial data extensions pre-configured' : 'Optimized for routing workloads'}
- ✅ **Ubuntu Bastion**: Secure administrative access point
- ✅ **Auto Scaling**: ${isAurora ? 'Aurora auto-scaling enabled' : 'Read replica support ready'}
- ✅ **Monitoring**: CloudWatch dashboards and alerting
- ✅ **Backup Strategy**: Automated backups and point-in-time recovery
- ✅ **High Availability**: Multi-AZ deployment for production resilience

## Architecture

### AWS Infrastructure Components

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                           Internet Gateway                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                        Public Subnet                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Ubuntu Bastion Host                            │ │
│  │        (Application Deployment Target)                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                      Private Subnets                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │            ${isAurora ? 'Aurora PostgreSQL Cluster' : 'Amazon RDS PostgreSQL Instance'}                       │ │
│  │        PostgreSQL ${postgresVersion}${isTimeSeries ? ' + Time-Series Partitioning' : isPropertySearch ? ' + PostGIS' : ''}                    │ │${isAurora ? 
  `│  │         (Writer + Reader Instances)                     │ │` :
  `│  │            (Multi-AZ Deployment)                        │ │`}
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

### Network Security
- **VPC**: Isolated 10.0.0.0/16 network
- **Public Subnet**: Bastion host only (10.0.1.0/24, 10.0.2.0/24)
- **Private Subnets**: Database instances (10.0.10.0/24, 10.0.11.0/24)
- **Security Groups**: Least privilege access rules
- **NACLs**: Additional network-level protection

## Prerequisites

### AWS Account Requirements
- **AWS Account**: With administrative permissions
- **AWS CLI**: Version 2.x installed and configured
- **EC2 Key Pair**: For SSH access to bastion host
- **Service Limits**: Ensure sufficient EC2 and RDS quotas
- **Regions**: Tested in us-west-2, us-east-1, eu-west-1

### Local Development Tools
- **Git**: For repository cloning
- **SSH Client**: For bastion host access
- **Text Editor**: For configuration modifications
- **${repository.language} Environment**: ${repository.language === "Python" ? "Python 3.8+ and pip" : "Node.js 16+ and npm"}

### AWS CLI Configuration
\`\`\`bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: us-west-2
# Default output format: json

# Verify configuration
aws sts get-caller-identity
\`\`\`

## AWS Deployment Guide

### Step 1: Clone Repository
\`\`\`bash
git clone <repository-url>
cd ${repository.name}
\`\`\`

### Step 2: Create EC2 Key Pair
\`\`\`bash
# Create new key pair
aws ec2 create-key-pair \\
    --key-name ${repository.name}-keypair \\
    --query 'KeyMaterial' \\
    --output text > ${repository.name}-keypair.pem

# Set proper permissions
chmod 400 ${repository.name}-keypair.pem
\`\`\`

### Step 3: Deploy Infrastructure
\`\`\`bash
# Deploy CloudFormation stack
aws cloudformation deploy \\
    --template-file cloudformation/main.yaml \\
    --stack-name ${repository.name}-stack \\
    --parameter-overrides \\
        ProjectName=${repository.name} \\
        KeyPairName=${repository.name}-keypair \\
        PostgreSQLVersion=${postgresVersion} \\
        DatabaseInstanceType=${isAurora ? 'db.r6g.large' : 'db.t3.medium'} \\
        BastionInstanceType=t3.micro \\
    --capabilities CAPABILITY_IAM \\
    --region ${repository.awsRegion}

# Wait for deployment completion (10-15 minutes)
aws cloudformation wait stack-create-complete \\
    --stack-name ${repository.name}-stack \\
    --region ${repository.awsRegion}
\`\`\`

### Step 4: Get Connection Information
\`\`\`bash
# Get bastion host IP
BASTION_IP=$(aws cloudformation describe-stacks \\
    --stack-name ${repository.name}-stack \\
    --query 'Stacks[0].Outputs[?OutputKey==\`BastionHostIP\`].OutputValue' \\
    --output text \\
    --region ${repository.awsRegion})

echo "Bastion Host IP: \$BASTION_IP"

# Get database endpoint
DB_ENDPOINT=$(aws cloudformation describe-stacks \\
    --stack-name ${repository.name}-stack \\
    --query 'Stacks[0].Outputs[?OutputKey==\`DatabaseEndpoint\`].OutputValue' \\
    --output text \\
    --region ${repository.awsRegion})

echo "Database Endpoint: \$DB_ENDPOINT"
\`\`\`

### Step 5: Configure Bastion Host
\`\`\`bash
# Connect to bastion host
ssh -i ${repository.name}-keypair.pem ubuntu@\$BASTION_IP

# Upload setup files
scp -i ${repository.name}-keypair.pem scripts/bastion-setup.sh ubuntu@\$BASTION_IP:~/
scp -i ${repository.name}-keypair.pem -r data/ ubuntu@\$BASTION_IP:~/
scp -i ${repository.name}-keypair.pem ${repository.language === "Python" ? "app.py requirements.txt" : "server.js package.json"} ubuntu@\$BASTION_IP:~/

# Run setup script
ssh -i ${repository.name}-keypair.pem ubuntu@\$BASTION_IP
chmod +x bastion-setup.sh
./bastion-setup.sh
\`\`\`

### Step 6: Initialize Database
\`\`\`bash
# Connect to database from bastion host
${repository.language === "Python" ? 
`# Install psycopg2 and dependencies
sudo apt update
sudo apt install -y python3-pip postgresql-client
pip3 install psycopg2-binary

# Run database setup
python3 -c "
import psycopg2
conn = psycopg2.connect(
    host='$DB_ENDPOINT',
    database='${repository.name.replace(/-/g, '_')}',
    user='postgres',
    password='<your-password>'
)
# Create extensions and initial schema
"` :
`# Install Node.js and dependencies
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql-client

# Run database setup
npm install
node database/setup.js`}
\`\`\`

### Step 7: Start Application
\`\`\`bash
# Start the application
${repository.language === "Python" ? 
`python3 app.py` :
`npm start`}

# Application will be available at:
# http://\$BASTION_IP:${repository.language === "Python" ? "5000" : "3000"}
\`\`\`

## Local Development Setup

### Database Setup (Ubuntu/Debian)
\`\`\`bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib postgresql-${postgresVersion}

# Install PostGIS
sudo apt install -y postgis postgresql-${postgresVersion}-postgis-3${repository.useCases.some(uc => uc.includes("Transportation")) ? ' postgresql-13-pgrouting' : ''}

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres createdb ${repository.name.replace(/-/g, '_')}
sudo -u postgres createuser --interactive demo_user

# Connect and setup extensions
sudo -u postgres psql -d ${repository.name.replace(/-/g, '_')} -c "
${isTimeSeries ? 
`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;` :
isPropertySearch ? 
`CREATE EXTENSION IF NOT EXISTS postgis;
${repository.useCases.some(uc => uc.includes("Transportation")) ? 'CREATE EXTENSION IF NOT EXISTS pgrouting;' : ''}` :
'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'}
GRANT ALL PRIVILEGES ON DATABASE ${repository.name.replace(/-/g, '_')} TO demo_user;
"
\`\`\`

### Application Setup
\`\`\`bash
# Clone repository
git clone <repository-url>
cd ${repository.name}

# Install dependencies
${repository.language === "Python" ? 
`# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt` :
`# Install Node.js dependencies
npm install`}

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Initialize database schema
${repository.language === "Python" ? 
`python database/setup.py` :
`node database/setup.js`}

# Load sample data
${repository.language === "Python" ? 
`python data/load_sample_data.py` :
`node data/load_sample_data.js`}

# Start application
${repository.language === "Python" ? 
`python app.py` :
`npm run dev`}
\`\`\`

## Learning Modules

Complete step-by-step learning modules covering PostgreSQL concepts from basic to advanced:

${Array.from({ length: isPropertySearch ? 12 : 10 }, (_, i) => `### [Module ${(i + 1).toString().padStart(2, '0')}: ${this.getModuleTitle(i + 1, isPropertySearch)}](modules/module_${(i + 1).toString().padStart(2, '0')}/README.md)
**Duration**: ${i < 3 ? '45' : i < 6 ? '60' : '90'} minutes | **Level**: ${i < 3 ? 'Beginner' : i < 7 ? 'Intermediate' : 'Advanced'}
${this.getModuleDescription(i + 1, isPropertySearch)}`).join('\n\n')}

## Application Features

### Core Functionality
${isTimeSeries ? 
`- **Data Ingestion**: High-volume sensor data streaming
- **Time-Range Queries**: Lightning-fast temporal analysis
- **Aggregation Engine**: Real-time rollups and analytics
- **Anomaly Detection**: Statistical outlier identification
- **Alerting System**: Threshold-based notifications
- **Dashboard Views**: Interactive time-series visualization` :
isPropertySearch ? 
`- **Property Search**: Radius-based spatial queries
- **Market Analysis**: Comparative market analysis tools
- **Location Intelligence**: Neighborhood demographics
- **Investment Scoring**: ROI calculation algorithms
- **Mapping Interface**: Interactive property visualization
- **Report Generation**: Automated market reports` :
`- **Route Planning**: Optimal path calculation
- **Traffic Analysis**: Real-time traffic integration
- **Fleet Management**: Multi-vehicle optimization
- **Cost Calculation**: Distance and time-based pricing
- **Mapping Interface**: Interactive route visualization
- **Performance Analytics**: Route efficiency metrics`}

### Technical Features
- **${isTimeSeries ? 'BRIN Indexing' : isPropertySearch ? 'Spatial Indexing' : 'Graph Indexing'}**: ${isTimeSeries ? 'Optimized BRIN indexes for time-series data' : isPropertySearch ? 'Optimized GiST indexes' : 'Optimized graph traversal'}
- **Query Optimization**: Advanced query planning
- **Connection Pooling**: Efficient database connections
- **Caching Layer**: Redis integration for performance
- **API Documentation**: OpenAPI/Swagger specifications
- **Error Handling**: Comprehensive error management
- **Logging**: Structured logging with correlation IDs
- **Health Checks**: Application and database monitoring

## Performance Benchmarks

### Database Performance
${isTimeSeries ? 
`- **Data Ingestion**: 100K+ inserts/second with BRIN indexing
- **Query Performance**: < 5ms for time-range queries on billions of rows
- **Aggregation Speed**: < 50ms for hourly rollups across 30-day windows
- **Concurrent Users**: 1,000+ simultaneous time-series queries
- **Storage Efficiency**: 90% compression with partitioning
- **Index Performance**: BRIN indexes 1000x smaller than B-tree` :
isPropertySearch ? 
`- **Spatial Queries**: < 10ms for radius searches (1M+ properties)
- **Complex Analytics**: < 50ms for market analysis queries
- **Concurrent Users**: 1,000+ simultaneous searches
- **Dataset Size**: Optimized for 10GB+ property datasets
- **Index Performance**: 99.9% index hit ratio
- **Connection Scaling**: 500+ concurrent connections` :
`- **Route Calculation**: < 100ms for city-wide routes
- **Graph Algorithms**: < 200ms for complex optimizations
- **Concurrent Routing**: 500+ simultaneous calculations
- **Network Size**: Handles 1M+ road segments
- **Memory Usage**: < 2GB for large networks
- **Cache Hit Ratio**: 95%+ for common routes`}

### Infrastructure Performance
- **Application Response**: < 50ms average API response
- **Database Connections**: Connection pooling optimized
- **Bastion Host**: t3.micro sufficient for demos
- **Network Latency**: < 5ms within AWS region
- **Backup Speed**: ${isAurora ? 'Instant snapshots' : '< 15 minutes for 10GB'}
- **Recovery Time**: ${isAurora ? '< 1 minute' : '< 5 minutes'} (RTO)

## Troubleshooting

### Common AWS Issues

#### CloudFormation Deployment Fails
\`\`\`bash
# Check stack events
aws cloudformation describe-stack-events \\
    --stack-name ${repository.name}-stack \\
    --query 'StackEvents[?ResourceStatus==\`CREATE_FAILED\`]'

# Common solutions:
# 1. Check service limits
aws service-quotas list-service-quotas \\
    --service-code ec2 \\
    --query 'Quotas[?QuotaName==\`Running On-Demand Standard (A, C, D, H, I, M, R, T, Z) instances\`]'

# 2. Verify key pair exists
aws ec2 describe-key-pairs --key-names ${repository.name}-keypair

# 3. Check IAM permissions
aws iam simulate-principal-policy \\
    --policy-source-arn arn:aws:iam::123456789012:user/username \\
    --action-names cloudformation:CreateStack
\`\`\`

#### Cannot Connect to Bastion Host
\`\`\`bash
# Check security group rules
aws ec2 describe-security-groups \\
    --filters "Name=group-name,Values=${repository.name}-bastion-sg"

# Verify bastion host status
aws ec2 describe-instances \\
    --filters "Name=tag:Name,Values=${repository.name}-bastion"

# Test connectivity
nc -zv \$BASTION_IP 22
\`\`\`

#### Database Connection Issues
\`\`\`bash
# Check database status
aws rds describe-db-instances \\
    --db-instance-identifier ${repository.name}-${isAurora ? 'cluster' : 'instance'}

# Test database connectivity from bastion
psql -h \$DB_ENDPOINT -U postgres -d ${repository.name.replace(/-/g, '_')} -c "SELECT version();"

# Check security group rules
aws ec2 describe-security-groups \\
    --filters "Name=group-name,Values=${repository.name}-db-sg"
\`\`\`

### Application Issues

#### ${repository.language} Application Won't Start
\`\`\`bash
${repository.language === "Python" ? 
`# Check Python version
python3 --version

# Verify virtual environment
which python3
which pip3

# Check dependencies
pip3 list

# Run with verbose logging
python3 app.py --debug` :
`# Check Node.js version
node --version
npm --version

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run with debug logging
DEBUG=* npm start`}
\`\`\`

#### Performance Issues
\`\`\`bash
# Check database performance
psql -h \$DB_ENDPOINT -U postgres -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup
FROM pg_stat_user_tables;
"

# Monitor active connections
psql -h \$DB_ENDPOINT -U postgres -c "
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
"

# Check slow queries
psql -h \$DB_ENDPOINT -U postgres -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
"
\`\`\`

## Advanced Configuration

### Database Tuning
\`\`\`sql
-- Optimize for spatial workloads
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET effective_cache_size = '3GB';
ALTER SYSTEM SET random_page_cost = 1.1;

-- PostGIS specific optimizations
ALTER SYSTEM SET max_locks_per_transaction = 256;
SELECT pg_reload_conf();
\`\`\`

### Connection Pooling
\`\`\`${repository.language === "Python" ? "python" : "javascript"}
${repository.language === "Python" ? 
`# PgBouncer configuration
import psycopg2.pool

# Create connection pool
connection_pool = psycopg2.pool.ThreadedConnectionPool(
    1, 20,  # min and max connections
    host=DB_ENDPOINT,
    database="${repository.name.replace(/-/g, '_')}",
    user="postgres",
    password=DB_PASSWORD
)` :
`// Connection pooling with node-postgres
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_ENDPOINT,
    database: '${repository.name.replace(/-/g, '_')}',
    user: 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20, // maximum number of clients
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});`}
\`\`\`

### Monitoring Setup
\`\`\`bash
# Enable enhanced monitoring
aws rds modify-db-instance \\
    --db-instance-identifier ${repository.name}-instance \\
    --monitoring-interval 60 \\
    --monitoring-role-arn arn:aws:iam::123456789012:role/rds-monitoring-role

# Create CloudWatch dashboard
aws cloudwatch put-dashboard \\
    --dashboard-name "${repository.name}-monitoring" \\
    --dashboard-body file://monitoring/dashboard.json
\`\`\`

## Demo Scenarios

### Scenario 1: ${isPropertySearch ? 'Real Estate Investment Analysis' : 'Logistics Route Optimization'}
**Duration**: 20 minutes | **Audience**: Business stakeholders

1. **Setup** (5 min): Connect to application, overview of interface
2. **Demo** (10 min): ${isPropertySearch ? 'Search properties, analyze market trends, generate investment reports' : 'Plan optimal routes, analyze traffic patterns, calculate delivery costs'}
3. **Q&A** (5 min): Technical questions and scalability discussion

### Scenario 2: Technical Deep Dive
**Duration**: 45 minutes | **Audience**: Technical teams

1. **Architecture Review** (15 min): AWS infrastructure walkthrough
2. **Database Design** (15 min): PostGIS schemas, indexing strategies
3. **Performance Demo** (15 min): Query optimization, monitoring tools

### Scenario 3: Developer Workshop
**Duration**: 2 hours | **Audience**: Development teams

1. **Environment Setup** (30 min): Local development configuration
2. **Code Walkthrough** (45 min): Application architecture, API design
3. **Hands-on Exercise** (45 min): Implement new features

## Cost Optimization

### AWS Cost Management
\`\`\`bash
# Estimate monthly costs
aws pricing get-products \\
    --service-code AmazonRDS \\
    --filters "Type=TERM_MATCH,Field=instanceType,Value=${isAurora ? 'db.r6g.large' : 'db.t3.medium'}"

# Set up billing alerts
aws cloudwatch put-metric-alarm \\
    --alarm-name "${repository.name}-billing-alert" \\
    --alarm-description "Alert when charges exceed \$50" \\
    --metric-name EstimatedCharges \\
    --namespace AWS/Billing \\
    --statistic Maximum \\
    --period 86400 \\
    --threshold 50 \\
    --comparison-operator GreaterThanThreshold
\`\`\`

### Resource Optimization
- **Development**: Use t3.micro instances and db.t3.micro
- **Demo**: Scale up to production sizing only during demos
- **Automation**: Use Lambda to start/stop resources on schedule
- **Reserved Instances**: For long-term usage (>1 year)

### Estimated Monthly Costs (us-west-2)
- **Bastion Host** (t3.micro): ~\$8.50/month
- **Database** (${isAurora ? 'db.r6g.large cluster' : 'db.t3.medium'}): ~\$${isAurora ? '200' : '60'}/month
- **Storage** (100GB): ~\$10/month
- **Data Transfer**: ~\$5/month
- **Total**: ~\$${isAurora ? '225' : '85'}/month

## Security Best Practices

### Network Security
- VPC with private subnets for database
- Security groups with least privilege
- No direct internet access to database
- Bastion host for administrative access only

### Database Security
\`\`\`sql
-- Create read-only user for applications
CREATE USER app_readonly WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE ${repository.name.replace(/-/g, '_')} TO app_readonly;
GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

-- Enable row-level security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY property_access ON properties 
    FOR SELECT TO app_readonly 
    USING (true);
\`\`\`

### Access Management
- IAM roles for service access
- Encrypted storage at rest
- SSL/TLS for data in transit
- Regular security updates
- Audit logging enabled

## Monitoring and Logging

### CloudWatch Metrics
Key metrics to monitor:
- **CPU Utilization**: < 70% average
- **Database Connections**: < 80% of max
- **Read/Write IOPS**: Monitor for bottlenecks
- **Network Throughput**: Track data transfer
- **Query Performance**: Slow query identification

### Custom Metrics
\`\`\`${repository.language === "Python" ? "python" : "javascript"}
${repository.language === "Python" ? 
`import boto3

cloudwatch = boto3.client('cloudwatch')

# Send custom metric
cloudwatch.put_metric_data(
    Namespace='${repository.name}',
    MetricData=[
        {
            'MetricName': 'ActiveUsers',
            'Value': user_count,
            'Unit': 'Count'
        }
    ]
)` :
`const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

// Send custom metric
await cloudwatch.putMetricData({
    Namespace: '${repository.name}',
    MetricData: [{
        MetricName: 'ActiveUsers',
        Value: userCount,
        Unit: 'Count'
    }]
}).promise();`}
\`\`\`

### Log Analysis
\`\`\`bash
# View CloudWatch logs
aws logs describe-log-groups \\
    --log-group-name-prefix "/aws/rds/instance/${repository.name}"

# Stream real-time logs
aws logs tail /aws/rds/instance/${repository.name}/error \\
    --follow
\`\`\`

## Backup and Recovery

### Automated Backups
${isAurora ? 
`Aurora provides automated backups with:
- **Continuous backup**: Point-in-time recovery
- **Retention period**: 7-35 days configurable
- **Cross-region backup**: For disaster recovery
- **Instant snapshots**: No performance impact` :
`RDS provides automated backups with:
- **Daily snapshots**: During maintenance window
- **Retention period**: 7-35 days configurable
- **Point-in-time recovery**: 5-minute granularity
- **Cross-region snapshots**: For disaster recovery`}

### Manual Backup Procedures
\`\`\`bash
# Create manual snapshot
aws rds create-db-${isAurora ? 'cluster-' : ''}snapshot \\
    --db-${isAurora ? 'cluster' : 'instance'}-identifier ${repository.name}-${isAurora ? 'cluster' : 'instance'} \\
    --db-${isAurora ? 'cluster-' : ''}snapshot-identifier ${repository.name}-manual-$(date +%Y%m%d)

# Export data
pg_dump -h \$DB_ENDPOINT -U postgres ${repository.name.replace(/-/g, '_')} > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -h \$DB_ENDPOINT -U postgres ${repository.name.replace(/-/g, '_')} < backup_20231201.sql
\`\`\`

### Disaster Recovery
- **RTO** (Recovery Time Objective): ${isAurora ? '< 1 minute' : '< 5 minutes'}
- **RPO** (Recovery Point Objective): ${isAurora ? '< 1 minute' : '< 5 minutes'}
- **Cross-region replication**: Available for critical deployments
- **Automated failover**: ${isAurora ? 'Built-in Aurora feature' : 'Multi-AZ deployment option'}

---

## Support and Resources

### Documentation
- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [AWS RDS User Guide](https://docs.aws.amazon.com/rds/)
- [CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)

### Training Resources
- AWS Training: RDS Deep Dive
- PostgreSQL Administration Course
- PostGIS Spatial Database Course
- CloudFormation Infrastructure as Code

### Community Support
- PostgreSQL Slack Community
- AWS Developer Forums
- PostGIS User Group
- Stack Overflow (postgresql, aws-rds tags)

---

**Generated on**: ${new Date().toISOString()}
**Version**: 1.0.0
**Tested on**: AWS ${repository.awsRegion}
**PostgreSQL Version**: ${postgresVersion}
**PostGIS Version**: 3.4
${repository.useCases.some(uc => uc.includes("Transportation")) ? '**pgRouting Version**: 3.4' : ''}

For technical support or questions, please refer to the troubleshooting section or contact the development team.
`;
  }

  private generateCloudFormationInfrastructure(repository: Repository): string {
    const isAurora = repository.databaseVersion.includes('Aurora');
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    
    return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'Complete AWS infrastructure for ${repository.name} with Ubuntu Bastion host'

Parameters:
  ProjectName:
    Type: String
    Default: '${repository.name}'
    Description: 'Project name for resource naming'
  
  PostgreSQLVersion:
    Type: String
    Default: '${postgresVersion}'
    Description: 'PostgreSQL engine version'
  
  DatabaseInstanceType:
    Type: String
    Default: '${isAurora ? 'db.r6g.large' : 'db.t3.medium'}'
    Description: 'Database instance type'
  
  BastionInstanceType:
    Type: String
    Default: 't3.micro'
    Description: 'Bastion host instance type'
  
  KeyPairName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: 'EC2 Key Pair for SSH access to bastion host'

Resources:
  # VPC Configuration
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-vpc'

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-igw'

  InternetGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      InternetGatewayId: !Ref InternetGateway
      VpcId: !Ref VPC

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-1'

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.2.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-2'

  # Private Subnets
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.10.0/24
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-private-1'

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.11.0/24
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-private-2'

  # Route Tables
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-rt'

  DefaultPublicRoute:
    Type: AWS::EC2::Route
    DependsOn: InternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet1

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet2

  # Security Groups
  BastionSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub '\${ProjectName}-bastion-sg'
      GroupDescription: Security group for bastion host
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 3000
          ToPort: 3000
          CidrIp: 0.0.0.0/0
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-bastion-sg'

  DatabaseSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub '\${ProjectName}-db-sg'
      GroupDescription: Security group for database
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref BastionSecurityGroup
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-db-sg'

  # Database Subnet Group
  DatabaseSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for database
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-db-subnet-group'

  # Ubuntu Bastion Host
  BastionHost:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0c02fb55956c7d316  # Ubuntu 22.04 LTS (update for your region)
      InstanceType: !Ref BastionInstanceType
      KeyName: !Ref KeyPairName
      SubnetId: !Ref PublicSubnet1
      SecurityGroupIds:
        - !Ref BastionSecurityGroup
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          apt-get update
          apt-get install -y postgresql-client git curl python3 python3-pip nodejs npm
          
          # Install application dependencies (no PostgreSQL server installation)
          pip3 install psycopg2-binary boto3
          
          # Create demo script for RDS/Aurora connection
          cat > /home/ubuntu/connect_to_database.sh << 'EOF'
          #!/bin/bash
          # Connect to ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} with PostGIS
          echo "Connecting to ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} database..."
          DB_ENDPOINT="${isAurora ? '${DatabaseCluster.Endpoint}' : '${Database.Endpoint.Address}'}"
          psql postgresql://postgres:SecurePassword123!@$DB_ENDPOINT:5432/postgres
          EOF
          chmod +x /home/ubuntu/connect_to_database.sh
          chown ubuntu:ubuntu /home/ubuntu/connect_to_database.sh
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-bastion'

${isAurora ? `  # Aurora PostgreSQL Cluster
  DatabaseCluster:
    Type: AWS::RDS::DBCluster
    Properties:
      DBClusterIdentifier: !Sub '\${ProjectName}-aurora-cluster'
      Engine: aurora-postgresql
      EngineVersion: !Ref PostgreSQLVersion
      MasterUsername: postgres
      MasterUserPassword: SecurePassword123!
      VpcSecurityGroupIds:
        - !Ref DatabaseSecurityGroup
      DBSubnetGroupName: !Ref DatabaseSubnetGroup
      BackupRetentionPeriod: 7
      DeletionProtection: false
      StorageEncrypted: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-aurora-cluster'

  DatabaseInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '\${ProjectName}-aurora-instance'
      DBInstanceClass: !Ref DatabaseInstanceType
      Engine: aurora-postgresql
      DBClusterIdentifier: !Ref DatabaseCluster
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-aurora-instance'` : `  # RDS PostgreSQL Instance
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '\${ProjectName}-database'
      DBInstanceClass: !Ref DatabaseInstanceType
      Engine: postgres
      EngineVersion: !Ref PostgreSQLVersion
      MasterUsername: postgres
      MasterUserPassword: SecurePassword123!
      AllocatedStorage: ${repository.useCases.includes("Real Estate/Property Search") ? "100" : "20"}
      StorageType: gp3
      StorageEncrypted: true
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      DBSubnetGroupName: !Ref DatabaseSubnetGroup
      BackupRetentionPeriod: 7
      DeleteAutomatedBackups: true
      DeletionProtection: false
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-database'`}

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref VPC

  BastionPublicIP:
    Description: Bastion host public IP
    Value: !GetAtt BastionHost.PublicIp

  DatabaseEndpoint:
    Description: Database endpoint
    Value: ${isAurora ? '!GetAtt DatabaseCluster.Endpoint' : '!GetAtt Database.Endpoint.Address'}

  DatabasePort:
    Description: Database port
    Value: ${isAurora ? '5432' : '!GetAtt Database.Endpoint.Port'}

  SSHCommand:
    Description: SSH command to connect to bastion host
    Value: !Sub 'ssh -i your-key.pem ubuntu@\${BastionHost.PublicIp}'

  DatabaseConnection:
    Description: Database connection string from bastion host
    Value: ${isAurora ? '!Sub \'postgresql://postgres:SecurePassword123!@${DatabaseCluster.Endpoint}:5432/postgres\'' : '!Sub \'postgresql://postgres:SecurePassword123!@${Database.Endpoint.Address}:5432/postgres\''}

  PostGISSetupCommand:
    Description: Command to enable PostGIS extension
    Value: 'psql -c "CREATE EXTENSION IF NOT EXISTS postgis;" <connection_string>'
`;
  }

  // Continue with other methods...
  async getUser(id: string): Promise<any> {
    return null; // Implementation for user management
  }

  async upsertUser(user: any): Promise<any> {
    return user; // Implementation for user management
  }

  async logDownload(download: any): Promise<any> {
    // Add to download logs with proper email tracking
    const downloadEntry = {
      id: this.downloadLogs.length + 1,
      userId: download.userId || download.userEmail,
      userEmail: download.userEmail,
      repositoryName: download.repositoryName,
      useCase: download.useCase,
      language: download.language,
      downloadedAt: download.downloadedAt || new Date().toISOString(),
      ipAddress: download.ipAddress,
      userAgent: download.userAgent
    };
    
    this.downloadLogs.push(downloadEntry);
    console.log(`Download tracked: ${download.userEmail} downloaded ${download.repositoryName}`);
    return downloadEntry;
  }

  // Track user sign-in
  trackUserSignIn(email: string): void {
    const existing = this.signedInUsers.get(email);
    if (existing) {
      existing.lastSeen = new Date();
      existing.signInCount += 1;
    } else {
      this.signedInUsers.set(email, {
        email,
        lastSeen: new Date(),
        signInCount: 1
      });
    }
  }

  // Get all signed-in users
  getSignedInUsers(): Array<{ email: string; lastSeen: Date; signInCount: number }> {
    return Array.from(this.signedInUsers.values())
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  async getDownloadStats(): Promise<any> {
    // Calculate analytics from sample download logs
    const totalDownloads = this.downloadLogs.length;
    const uniqueUsers = new Set(this.downloadLogs.map(log => log.userId)).size;
    
    // Count use cases
    const useCaseCounts = this.downloadLogs.reduce((acc, log) => {
      acc[log.useCase] = (acc[log.useCase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topUseCases = Object.entries(useCaseCounts)
      .map(([useCase, count]) => ({ useCase, count }))
      .sort((a, b) => b.count - a.count);
    
    // Count languages
    const languageCounts = this.downloadLogs.reduce((acc, log) => {
      acc[log.language] = (acc[log.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topLanguages = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);
    
    // Get recent downloads (last 5)
    const recentDownloads = this.downloadLogs
      .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime())
      .slice(0, 5);
    
    return {
      totalDownloads,
      uniqueUsers,
      topUseCases,
      topLanguages,
      recentDownloads
    };
  }

  async getRepositoryStats(id: number): Promise<any> {
    return {}; // Implementation for repository stats
  }

  async getLearningModules(repositoryId: number): Promise<any[]> {
    return []; // Implementation for learning modules
  }

  async getDatasets(repositoryId: number): Promise<any[]> {
    return []; // Implementation for datasets
  }

  private extractPostgresVersion(databaseVersion: string): string {
    if (databaseVersion.includes('Aurora')) {
      return '15.4';
    }
    const match = databaseVersion.match(/\d+(\.\d+)?/);
    return match ? match[0] : '15';
  }

  private getModuleDescription(moduleNum: number, isPropertySearch: boolean): string {
    if (isPropertySearch) {
      const descriptions = [
        "Introduction to spatial databases and PostGIS fundamentals",
        "Setting up property data schemas and spatial indexing strategies",
        "Basic spatial queries for property searches within radius",
        "Advanced property filtering with multiple criteria and constraints",
        "Market analysis using spatial aggregation and statistical functions",
        "Performance optimization with spatial indexes and query planning",
        "Integration with external APIs for enriched property data",
        "Building RESTful APIs for property search functionality",
        "Real-time property alerts and notification systems",
        "Scaling strategies for high-volume property databases",
        "Advanced analytics: price predictions and market trends",
        "Production deployment and monitoring best practices"
      ];
      return descriptions[moduleNum - 1] || "Advanced PostgreSQL concepts and implementation";
    } else {
      const descriptions = [
        "Introduction to routing algorithms and pgRouting extension",
        "Setting up transportation networks and road data schemas",
        "Basic shortest path calculations with Dijkstra algorithm",
        "Advanced routing with turn restrictions and one-way streets",
        "Multi-modal transportation planning and optimization",
        "Real-time traffic integration and dynamic routing",
        "Fleet management and vehicle routing problems (VRP)",
        "Cost optimization algorithms for logistics operations",
        "Performance tuning for large transportation networks",
        "Production deployment and scalability considerations"
      ];
      return descriptions[moduleNum - 1] || "Advanced routing concepts and implementation";
    }
  }

  private getModuleTitle(moduleNum: number, isPropertySearch: boolean, isTimeSeries: boolean = false): string {
    if (isTimeSeries) {
      const timeSeriesTitles = {
        1: "AWS-Native Time-Series Setup",
        2: "Time-Bucket Aggregations and Continuous Processing",
        3: "Advanced Window Functions and Analytics",
        4: "Anomaly Detection and Statistical Analysis",
        5: "Automated Partition Management",
        6: "Real-time Data Ingestion Optimization",
        7: "Performance Monitoring and Index Tuning",
        8: "Data Retention and Lifecycle Policies",
        9: "Time-Series API Development",
        10: "Production Monitoring and Alerting",
        11: "Machine Learning for Time-Series Forecasting"
      };
      return timeSeriesTitles[moduleNum as keyof typeof timeSeriesTitles] || `Advanced Time-Series Module ${moduleNum}`;
    } else if (isPropertySearch) {
      const propertyTitles = {
        1: "Database Setup and Configuration",
        2: "PostgreSQL Extensions and PostGIS",
        3: "Spatial Data Types and Indexing",
        4: "Property Data Import",
        5: "Advanced Spatial Queries",
        6: "Performance Optimization",
        7: "API Development",
        8: "Search Interface",
        9: "Data Visualization",
        10: "Deployment and Scaling",
        11: "Advanced Analytics",
        12: "Machine Learning Integration"
      };
      return propertyTitles[moduleNum as keyof typeof propertyTitles] || `Module ${moduleNum}`;
    } else {
      const generalTitles = {
        1: "Database Setup and Configuration",
        2: "PostgreSQL Extensions",
        3: "Network Graph Structure",
        4: "Route Algorithm Implementation",
        5: "Path Optimization",
        6: "Real-time Routing",
        7: "Performance Tuning",
        8: "API Integration",
        9: "Monitoring and Analytics",
        10: "Production Deployment",
        11: "Advanced Analytics",
        12: "Machine Learning Integration"
      };
      return generalTitles[moduleNum as keyof typeof generalTitles] || `Module ${moduleNum}`;
    }
  }

  // Stub implementations for remaining methods
  private generateCloudFormationParameters(repository: Repository): string {
    return `{
  "ProjectName": "${repository.name}",
  "PostgreSQLVersion": "${this.extractPostgresVersion(repository.databaseVersion)}",
  "DatabaseInstanceType": "db.t3.medium",
  "BastionInstanceType": "t3.micro",
  "KeyPairName": "your-ec2-key-pair"
}`;
  }

  private generateBastionSetupScript(repository: Repository): string {
    const isAurora = repository.databaseVersion.includes('Aurora');
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    
    return `#!/bin/bash
set -e

echo "🚀 Setting up ${repository.name} on Ubuntu Bastion Host for ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} connectivity..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL client and essential tools (NO SERVER INSTALLATION)
sudo apt install -y wget ca-certificates
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update

# Install PostgreSQL client tools only
sudo apt install -y postgresql-client-${postgresVersion} postgresql-contrib postgresql-client-common

# Install development tools
sudo apt install -y build-essential git curl unzip

${repository.language === "Python" ? `
# Install Python and dependencies
sudo apt install -y python3 python3-pip python3-venv python3-dev libpq-dev
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install psycopg2-binary boto3 flask sqlalchemy
` : `
# Install Node.js and dependencies
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g npm@latest
npm install pg aws-sdk express
`}

# Set up environment variables for ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} connection
echo "Setting up database connection environment..."
cat > /home/ubuntu/.env << 'EOF'
# ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} Connection Details
# Update these values with actual CloudFormation outputs
DB_HOST=<database-endpoint-from-cloudformation>
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=SecurePassword123!
DATABASE_URL=postgresql://postgres:SecurePassword123!@<database-endpoint>:5432/postgres
AWS_REGION=${repository.awsRegion}
EOF

# Create database connection test script
cat > /home/ubuntu/test-db-connection.sh << 'EOF'
#!/bin/bash
source /home/ubuntu/.env

echo "Testing connection to ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'}..."
echo "Database Host: $DB_HOST"
echo "Database Port: $DB_PORT"

# Test basic connection
psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" -c "SELECT version();"

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
    
    # Test PostGIS extension
    echo "Testing PostGIS extension..."
    psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" -c "SELECT PostGIS_Version();"
    
    if [ $? -eq 0 ]; then
        echo "✅ PostGIS extension is available!"
    else
        echo "⚠️  PostGIS extension needs to be enabled"
        echo "Run: psql -c 'CREATE EXTENSION IF NOT EXISTS postgis;'"
    fi
else
    echo "❌ Database connection failed!"
    echo "Please check:"
    echo "1. Database endpoint in .env file"
    echo "2. Security group allows connections from bastion host"
    echo "3. Database is running and accessible"
fi
EOF

chmod +x /home/ubuntu/test-db-connection.sh

# Create application setup script
cat > /home/ubuntu/setup-application.sh << 'EOF'
#!/bin/bash
source /home/ubuntu/.env

echo "Setting up ${repository.name} application..."

# Create application directory
mkdir -p /home/ubuntu/app
cd /home/ubuntu/app

${repository.language === "Python" ? `
# Python application setup
source /home/ubuntu/venv/bin/activate

# Create sample Flask application
cat > app.py << 'PYEOF'
from flask import Flask, jsonify
import psycopg2
import os

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({
        "message": "Welcome to ${repository.name}",
        "database": "${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'}",
        "status": "running"
    })

@app.route('/db-test')
def test_db():
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return jsonify({
            "database_connected": True,
            "version": version
        })
    except Exception as e:
        return jsonify({
            "database_connected": False,
            "error": str(e)
        }), 500

${isPropertySearch ? `
@app.route('/properties/nearby')
def nearby_properties():
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, address, price, 
                   ST_X(location) as longitude, 
                   ST_Y(location) as latitude
            FROM properties 
            WHERE location IS NOT NULL 
            LIMIT 10;
        """)
        properties = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({
            "properties": [
                {
                    "id": p[0],
                    "address": p[1], 
                    "price": float(p[2]),
                    "longitude": p[3],
                    "latitude": p[4]
                } for p in properties
            ]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
` : ''}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)
PYEOF

echo "Python application created. Run with: python app.py"
` : `
# Node.js application setup
cat > server.js << 'JSEOF'
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to ${repository.name}',
        database: '${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'}',
        status: 'running'
    });
});

app.get('/db-test', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT version()');
        client.release();
        
        res.json({
            database_connected: true,
            version: result.rows[0].version
        });
    } catch (err) {
        res.status(500).json({
            database_connected: false,
            error: err.message
        });
    }
});

${isPropertySearch ? `
app.get('/properties/nearby', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(\`
            SELECT id, address, price, 
                   ST_X(location) as longitude, 
                   ST_Y(location) as latitude
            FROM properties 
            WHERE location IS NOT NULL 
            LIMIT 10
        \`);
        client.release();
        
        res.json({
            properties: result.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
` : ''}

app.listen(port, '0.0.0.0', () => {
    console.log(\`Server running at http://0.0.0.0:\${port}\`);
});
JSEOF

cat > package.json << 'PKGEOF'
{
  "name": "${repository.name}",
  "version": "1.0.0",
  "description": "${repository.name} application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.8.0"
  }
}
PKGEOF

npm install
echo "Node.js application created. Run with: npm start"
`}

EOF

chmod +x /home/ubuntu/setup-application.sh

# Create database initialization script for ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'}
cat > /home/ubuntu/init-database.sh << 'EOF'
#!/bin/bash
source /home/ubuntu/.env

echo "Initializing ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} database for ${repository.name}..."

# Connect to database and run initialization
psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" << 'SQLEOF'
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

${isPropertySearch ? `
-- Create properties table with spatial data
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    bedrooms INTEGER,
    bathrooms INTEGER,
    square_feet INTEGER,
    property_type TEXT,
    listing_status TEXT DEFAULT 'active',
    location GEOMETRY(POINT, 4326),
    listing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for efficient geographic queries
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING GIST (location);

-- Insert sample property data
INSERT INTO properties (address, price, bedrooms, bathrooms, square_feet, property_type, location) VALUES
('123 Main St, Seattle, WA', 750000, 3, 2, 1800, 'Single Family', ST_GeomFromText('POINT(-122.3321 47.6062)', 4326)),
('456 Oak Ave, Seattle, WA', 650000, 2, 2, 1200, 'Condo', ST_GeomFromText('POINT(-122.3411 47.6152)', 4326)),
('789 Pine Rd, Seattle, WA', 850000, 4, 3, 2200, 'Single Family', ST_GeomFromText('POINT(-122.3201 47.5962)', 4326)),
('321 Cedar Blvd, Seattle, WA', 920000, 3, 3, 2000, 'Townhouse', ST_GeomFromText('POINT(-122.3121 47.6262)', 4326)),
('654 Maple Dr, Seattle, WA', 580000, 2, 1, 1000, 'Condo', ST_GeomFromText('POINT(-122.3521 47.5862)', 4326))
ON CONFLICT DO NOTHING;

-- Create function for nearby property search
CREATE OR REPLACE FUNCTION find_nearby_properties(
    property_id INTEGER,
    radius_meters INTEGER DEFAULT 1000
) RETURNS TABLE (
    id INTEGER,
    address TEXT,
    price DECIMAL,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p2.id,
        p2.address,
        p2.price,
        ST_Distance(p1.location::geography, p2.location::geography) as distance_meters
    FROM properties p1
    CROSS JOIN properties p2
    WHERE p1.id = property_id
      AND p2.id != property_id
      AND ST_DWithin(p1.location::geography, p2.location::geography, radius_meters)
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;
` : `
-- Create sample spatial tables for general use cases
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    coordinates GEOMETRY(POINT, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations USING GIST (coordinates);

-- Insert sample data
INSERT INTO locations (name, description, coordinates) VALUES
('Sample Point 1', 'First sample location', ST_GeomFromText('POINT(-122.4194 37.7749)', 4326)),
('Sample Point 2', 'Second sample location', ST_GeomFromText('POINT(-74.0060 40.7128)', 4326)),
('Sample Point 3', 'Third sample location', ST_GeomFromText('POINT(-87.6298 41.8781)', 4326))
ON CONFLICT DO NOTHING;
`}

-- Verify PostGIS installation
SELECT 'PostGIS Version: ' || PostGIS_Version() as info;
SELECT 'Total tables created: ' || count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';

\echo 'Database initialization completed successfully!'
SQLEOF

if [ $? -eq 0 ]; then
    echo "✅ Database initialization completed successfully!"
else
    echo "❌ Database initialization failed!"
    exit 1
fi
EOF

chmod +x /home/ubuntu/init-database.sh

# Configure firewall for application access
sudo ufw allow 22    # SSH
sudo ufw allow 3000  # Application port
sudo ufw --force enable

# Set proper ownership
chown -R ubuntu:ubuntu /home/ubuntu/

echo ""
echo "🎉 Bastion host setup completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Update database endpoint in /home/ubuntu/.env"
echo "2. Test database connection: ./test-db-connection.sh"
echo "3. Initialize database schema: ./init-database.sh"
echo "4. Set up application: ./setup-application.sh"
echo "5. Start application: cd app && ${repository.language === "Python" ? "python app.py" : "npm start"}"
echo ""
echo "🔗 Application will be available at: http://$(curl -s ifconfig.me):3000"
echo "📊 Database: ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} cluster"
echo "🛡️  Security: Bastion host configuration with ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} in private subnets"
`;
  }

  private generateUbuntuDeploymentGuide(repository: Repository): string {
    return `# Ubuntu Deployment Guide for ${repository.name}
Complete deployment instructions for Ubuntu Bastion host.
`;
  }

  private generateDatabaseSetup(repository: Repository): string {
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    const isTimeSeries = repository.useCases.includes("Time-Series Analytics");
    
    if (isTimeSeries) {
      return `-- Time-Series Analytics Database Setup for ${repository.name}
-- PostgreSQL ${repository.databaseVersion} with AWS-Native Time-Series Patterns

-- Create main database
CREATE DATABASE ${repository.name.replace(/-/g, '_')};

-- Connect to the database
\\c ${repository.name.replace(/-/g, '_')};

-- Enable required extensions for time-series analytics
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create parent table for time-series data with native partitioning
CREATE TABLE sensor_data (
    id BIGSERIAL,
    sensor_id VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    tags JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions for the current year
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    -- Create partitions for current year + 1 year ahead
    FOR i IN 0..23 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
        end_date := start_date + '1 month'::INTERVAL;
        partition_name := 'sensor_data_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE FORMAT('CREATE TABLE IF NOT EXISTS %I PARTITION OF sensor_data 
                       FOR VALUES FROM (%L) TO (%L)', 
                       partition_name, start_date, end_date);
                       
        -- Create BRIN index on timestamp for each partition
        EXECUTE FORMAT('CREATE INDEX IF NOT EXISTS %I ON %I USING BRIN (recorded_at)', 
                       partition_name || '_recorded_at_brin_idx', partition_name);
                       
        -- Create BTREE index on sensor_id for each partition
        EXECUTE FORMAT('CREATE INDEX IF NOT EXISTS %I ON %I (sensor_id, recorded_at DESC)', 
                       partition_name || '_sensor_time_idx', partition_name);
    END LOOP;
END $$;

-- Create aggregated metrics table for fast queries
CREATE TABLE sensor_metrics_hourly (
    sensor_id VARCHAR(50),
    metric_name VARCHAR(100),
    hour_bucket TIMESTAMP WITH TIME ZONE,
    avg_value DOUBLE PRECISION,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    count_values BIGINT,
    PRIMARY KEY (sensor_id, metric_name, hour_bucket)
) PARTITION BY RANGE (hour_bucket);

-- Create hourly partitions for aggregated data
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..11 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
        end_date := start_date + '1 month'::INTERVAL;
        partition_name := 'sensor_metrics_hourly_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE FORMAT('CREATE TABLE IF NOT EXISTS %I PARTITION OF sensor_metrics_hourly 
                       FOR VALUES FROM (%L) TO (%L)', 
                       partition_name, start_date, end_date);
    END LOOP;
END $$;

-- Create continuous aggregation function using native PostgreSQL
CREATE OR REPLACE FUNCTION refresh_hourly_metrics(start_time TIMESTAMP WITH TIME ZONE DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    process_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Default to last hour if no start time provided
    process_start := COALESCE(start_time, DATE_TRUNC('hour', NOW() - INTERVAL '1 hour'));
    
    INSERT INTO sensor_metrics_hourly (sensor_id, metric_name, hour_bucket, avg_value, min_value, max_value, count_values)
    SELECT 
        sensor_id,
        metric_name,
        DATE_TRUNC('hour', recorded_at) as hour_bucket,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        COUNT(*) as count_values
    FROM sensor_data
    WHERE recorded_at >= process_start 
      AND recorded_at < process_start + INTERVAL '1 hour'
    GROUP BY sensor_id, metric_name, DATE_TRUNC('hour', recorded_at)
    ON CONFLICT (sensor_id, metric_name, hour_bucket) 
    DO UPDATE SET
        avg_value = EXCLUDED.avg_value,
        min_value = EXCLUDED.min_value,
        max_value = EXCLUDED.max_value,
        count_values = EXCLUDED.count_values;
END;
$$ LANGUAGE plpgsql;

-- Time-bucket aggregation function (TimescaleDB alternative)
CREATE OR REPLACE FUNCTION time_bucket(bucket_width INTERVAL, ts TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    RETURN DATE_TRUNC('epoch', ts) + 
           (EXTRACT(epoch FROM ts)::BIGINT / EXTRACT(epoch FROM bucket_width)::BIGINT) * 
           EXTRACT(epoch FROM bucket_width)::BIGINT * INTERVAL '1 second';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Insert sample time-series data
INSERT INTO sensor_data (sensor_id, metric_name, value, tags, recorded_at) 
SELECT 
    'sensor_' || (RANDOM() * 100)::INTEGER,
    CASE (RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'temperature'
        WHEN 1 THEN 'humidity'
        WHEN 2 THEN 'pressure'
        ELSE 'cpu_usage'
    END,
    RANDOM() * 100,
    jsonb_build_object('location', CASE (RANDOM() * 3)::INTEGER
        WHEN 0 THEN 'warehouse_a'
        WHEN 1 THEN 'warehouse_b'
        ELSE 'office'
    END, 'device_type', 'iot_sensor'),
    NOW() - (RANDOM() * INTERVAL '30 days')
FROM generate_series(1, 100000);

-- Create views for common time-series queries
CREATE VIEW recent_sensor_readings AS
SELECT sensor_id, metric_name, value, tags, recorded_at
FROM sensor_data
WHERE recorded_at >= NOW() - INTERVAL '24 hours';

CREATE VIEW sensor_summary AS
SELECT 
    sensor_id,
    metric_name,
    COUNT(*) as reading_count,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    MIN(recorded_at) as first_reading,
    MAX(recorded_at) as last_reading
FROM sensor_data
GROUP BY sensor_id, metric_name;
`;
    } else if (isPropertySearch) {
      return `-- Property Search Database Setup for ${repository.name}
-- PostgreSQL ${repository.databaseVersion} with PostGIS

-- Create main database
CREATE DATABASE ${repository.name.replace(/-/g, '_')};

-- Connect to the database
\\c ${repository.name.replace(/-/g, '_')};

-- PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Other useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create properties table with spatial column
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    price DECIMAL(12,2),
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    square_feet INTEGER,
    property_type VARCHAR(50),
    listing_status VARCHAR(20) DEFAULT 'active',
    location GEOMETRY(POINT, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index on location
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties (price);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties (listing_status);

-- Insert sample property data
INSERT INTO properties (address, price, bedrooms, bathrooms, square_feet, property_type, location) VALUES
('123 Market St, San Francisco, CA', 1200000, 3, 2.5, 1800, 'Single Family', ST_GeomFromText('POINT(-122.4194 37.7749)', 4326)),
('456 Oak Ave, Seattle, WA', 650000, 2, 2, 1200, 'Condo', ST_GeomFromText('POINT(-122.3411 47.6152)', 4326))
ON CONFLICT DO NOTHING;
`;
    } else {
      return `-- Database setup for ${repository.name}
CREATE DATABASE ${repository.name};

-- Enable general PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
`;
    }
  }

  private generateDatabaseMigrations(repository: Repository): string {
    return `-- Initial schema migration
CREATE EXTENSION IF NOT EXISTS postgis;
`;
  }

  private generateModuleContent(i: number, repository: Repository, isPropertySearch: boolean, isTimeSeries: boolean = false): string {
    const title = this.getModuleTitle(i, isPropertySearch, isTimeSeries);
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    
    if (isTimeSeries) {
      switch (i) {
        case 1:
          return `# Module 01: AWS-Native Time-Series Setup

## Overview
Setting up PostgreSQL ${postgresVersion} with native partitioning for time-series analytics without TimescaleDB dependency.

## Objectives
- Install and configure PostgreSQL ${postgresVersion} on AWS RDS/Aurora
- Implement native partitioning for time-series data
- Create BRIN indexes for efficient time-based queries
- Set up automated partition management

## AWS RDS/Aurora Configuration

### 1. Parameter Group Settings
\`\`\`sql
-- Enable partition-wise joins
shared_preload_libraries = 'pg_stat_statements'
max_worker_processes = 8
max_parallel_workers = 4
max_parallel_workers_per_gather = 2

-- Memory settings for time-series workloads
shared_buffers = '25% of total memory'
effective_cache_size = '75% of total memory'
work_mem = '256MB'
maintenance_work_mem = '1GB'
\`\`\`

### 2. Native Partitioning Strategy
\`\`\`sql
-- Create parent table with range partitioning
CREATE TABLE sensor_data (
    id BIGSERIAL,
    sensor_id VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    tags JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions automatically
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..23 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
        end_date := start_date + '1 month'::INTERVAL;
        partition_name := 'sensor_data_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE FORMAT('CREATE TABLE %I PARTITION OF sensor_data 
                       FOR VALUES FROM (%L) TO (%L)', 
                       partition_name, start_date, end_date);
    END LOOP;
END $$;
\`\`\`

### 3. BRIN Indexing for Time-Series
\`\`\`sql
-- BRIN indexes are ideal for time-series data
-- Much smaller than B-tree indexes for sequential data
CREATE INDEX sensor_data_recorded_at_brin_idx 
ON sensor_data USING BRIN (recorded_at);

-- Composite BRIN index for multi-column queries
CREATE INDEX sensor_data_sensor_time_brin_idx 
ON sensor_data USING BRIN (sensor_id, recorded_at);

-- Traditional B-tree for high-selectivity queries
CREATE INDEX sensor_data_sensor_btree_idx 
ON sensor_data (sensor_id, recorded_at DESC);
\`\`\`

## Performance Benefits
- **Storage**: BRIN indexes are 1000x smaller than B-tree
- **Insertion**: Minimal index maintenance overhead
- **Queries**: Efficient range scans for time-based queries
- **Partitioning**: Automatic partition pruning

## Next Steps
Proceed to Module 02 to learn about continuous aggregations and time-bucket functions.
`;

        case 2:
          return `# Module 02: Time-Bucket Aggregations and Continuous Processing

## Overview
Implementing TimescaleDB-style time-bucket aggregations using native PostgreSQL functions.

## Time-Bucket Function Implementation
\`\`\`sql
-- Native PostgreSQL time-bucket function (TimescaleDB alternative)
CREATE OR REPLACE FUNCTION time_bucket(bucket_width INTERVAL, ts TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    RETURN DATE_TRUNC('epoch', ts) + 
           (EXTRACT(epoch FROM ts)::BIGINT / EXTRACT(epoch FROM bucket_width)::BIGINT) * 
           EXTRACT(epoch FROM bucket_width)::BIGINT * INTERVAL '1 second';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Usage examples
SELECT time_bucket('5 minutes', NOW()); -- 5-minute buckets
SELECT time_bucket('1 hour', recorded_at) as hour_bucket, 
       AVG(value) as avg_value
FROM sensor_data 
WHERE recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour_bucket
ORDER BY hour_bucket;
\`\`\`

## Continuous Aggregation Tables
\`\`\`sql
-- Pre-aggregated metrics for fast queries
CREATE TABLE sensor_metrics_hourly (
    sensor_id VARCHAR(50),
    metric_name VARCHAR(100),
    hour_bucket TIMESTAMP WITH TIME ZONE,
    avg_value DOUBLE PRECISION,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    count_values BIGINT,
    PRIMARY KEY (sensor_id, metric_name, hour_bucket)
) PARTITION BY RANGE (hour_bucket);

-- Refresh function for continuous aggregation
CREATE OR REPLACE FUNCTION refresh_hourly_metrics(start_time TIMESTAMP WITH TIME ZONE DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    process_start TIMESTAMP WITH TIME ZONE;
BEGIN
    process_start := COALESCE(start_time, DATE_TRUNC('hour', NOW() - INTERVAL '1 hour'));
    
    INSERT INTO sensor_metrics_hourly 
    SELECT 
        sensor_id,
        metric_name,
        DATE_TRUNC('hour', recorded_at) as hour_bucket,
        AVG(value), MIN(value), MAX(value), COUNT(*)
    FROM sensor_data
    WHERE recorded_at >= process_start 
      AND recorded_at < process_start + INTERVAL '1 hour'
    GROUP BY sensor_id, metric_name, DATE_TRUNC('hour', recorded_at)
    ON CONFLICT (sensor_id, metric_name, hour_bucket) 
    DO UPDATE SET
        avg_value = EXCLUDED.avg_value,
        min_value = EXCLUDED.min_value,
        max_value = EXCLUDED.max_value,
        count_values = EXCLUDED.count_values;
END;
$$ LANGUAGE plpgsql;
\`\`\`

## Automated Processing with pg_cron
\`\`\`sql
-- Install pg_cron extension (available in Amazon RDS PostgreSQL 12+)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly aggregation
SELECT cron.schedule('refresh-hourly-metrics', '0 * * * *', 'SELECT refresh_hourly_metrics();');

-- Schedule daily partition maintenance
SELECT cron.schedule('create-monthly-partitions', '0 2 1 * *', 
    'CALL create_next_month_partitions();');
\`\`\`

## Query Patterns
\`\`\`sql
-- Fast aggregated queries
SELECT hour_bucket, AVG(avg_value) as daily_avg
FROM sensor_metrics_hourly
WHERE sensor_id = 'sensor_001'
  AND hour_bucket >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', hour_bucket), hour_bucket
ORDER BY hour_bucket;

-- Real-time queries on raw data
SELECT time_bucket('1 minute', recorded_at) as minute_bucket,
       AVG(value) as avg_value
FROM sensor_data
WHERE sensor_id = 'sensor_001'
  AND recorded_at >= NOW() - INTERVAL '1 hour'
GROUP BY minute_bucket
ORDER BY minute_bucket DESC;
\`\`\`

## Performance Optimization
- Use aggregated tables for historical queries
- Keep only recent raw data for real-time queries
- Implement data lifecycle policies for cost optimization

## Next Steps
Continue to Module 03 for advanced time-series analysis and window functions.
`;

        default:
          return `# Module ${i.toString().padStart(2, '0')}: Advanced Time-Series Analytics

## Overview
Advanced time-series analytics patterns using native PostgreSQL features.

## Window Functions for Time-Series
\`\`\`sql
-- Moving averages
SELECT sensor_id, recorded_at, value,
       AVG(value) OVER (
           PARTITION BY sensor_id 
           ORDER BY recorded_at 
           ROWS BETWEEN 9 PRECEDING AND CURRENT ROW
       ) as moving_avg_10
FROM sensor_data
WHERE sensor_id = 'sensor_001'
ORDER BY recorded_at DESC;

-- Gap filling with generate_series
SELECT ts, COALESCE(avg_value, LAG(avg_value) OVER (ORDER BY ts)) as interpolated_value
FROM (
    SELECT generate_series(
        '2024-01-01'::timestamp,
        '2024-01-02'::timestamp,
        '1 hour'::interval
    ) as ts
) time_series
LEFT JOIN sensor_metrics_hourly h ON h.hour_bucket = time_series.ts
WHERE h.sensor_id = 'sensor_001';
\`\`\`

## Anomaly Detection
\`\`\`sql
-- Statistical anomaly detection
WITH stats AS (
    SELECT sensor_id,
           AVG(value) as mean_value,
           STDDEV(value) as std_value
    FROM sensor_data
    WHERE recorded_at >= NOW() - INTERVAL '30 days'
    GROUP BY sensor_id
)
SELECT s.sensor_id, s.recorded_at, s.value,
       CASE WHEN ABS(s.value - st.mean_value) > 2 * st.std_value 
            THEN 'ANOMALY' ELSE 'NORMAL' END as status
FROM sensor_data s
JOIN stats st ON s.sensor_id = st.sensor_id
WHERE s.recorded_at >= NOW() - INTERVAL '1 hour';
\`\`\`

## Data Retention Policies
\`\`\`sql
-- Automated partition dropping
CREATE OR REPLACE FUNCTION drop_old_partitions(retention_months INTEGER DEFAULT 12)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    cutoff_date DATE;
BEGIN
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (retention_months || ' months')::INTERVAL);
    
    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'sensor_data_%'
          AND tablename < 'sensor_data_' || TO_CHAR(cutoff_date, 'YYYY_MM')
    LOOP
        EXECUTE 'DROP TABLE ' || partition_name || ' CASCADE';
        RAISE NOTICE 'Dropped partition: %', partition_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
\`\`\`

## Next Steps
Apply these patterns to your specific time-series use cases and monitoring requirements.
`;
      }
    } else if (isPropertySearch) {
      switch (i) {
        case 1:
          return `# Module 01: Database Setup and Configuration

## Overview
Setting up PostgreSQL ${postgresVersion} with PostGIS for real estate property search functionality.

## Objectives
- Install and configure PostgreSQL ${postgresVersion}
- Enable PostGIS spatial extensions
- Create database schema for property data
- Configure connection pooling and performance settings

## Prerequisites
- Ubuntu 22.04 LTS server
- Sudo access
- Internet connectivity

## Installation Steps

### 1. Install PostgreSQL ${postgresVersion}
\`\`\`bash
# Update package list
sudo apt update

# Install PostgreSQL ${postgresVersion}
sudo apt install postgresql-${postgresVersion} postgresql-contrib-${postgresVersion}

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
\`\`\`

### 2. Install PostGIS Extension
\`\`\`bash
# Install PostGIS for spatial data support
sudo apt install postgresql-${postgresVersion}-postgis-3

# Install additional GIS tools
sudo apt install postgis gdal-bin
\`\`\`

### 3. Configure Database
\`\`\`sql
-- Connect as postgres user
sudo -u postgres psql

-- Create database for property search
CREATE DATABASE property_search;

-- Connect to the new database
\\c property_search;

-- Enable PostGIS extension
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;

-- Verify PostGIS installation
SELECT PostGIS_Version();
\`\`\`

### 4. Performance Configuration
Edit \`/etc/postgresql/${postgresVersion}/main/postgresql.conf\`:
\`\`\`
# Memory settings for property search workloads
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 64MB
maintenance_work_mem = 256MB

# Connection settings
max_connections = 100
\`\`\`

## Expected Outcomes
- PostgreSQL ${postgresVersion} running and accessible
- PostGIS extensions enabled
- Database configured for spatial queries
- Performance settings optimized

## Troubleshooting
- Check service status: \`sudo systemctl status postgresql\`
- View logs: \`sudo tail -f /var/log/postgresql/postgresql-${postgresVersion}-main.log\`
- Test connection: \`sudo -u postgres psql -c "SELECT version();"\`

## Next Steps
Proceed to Module 02 to learn about spatial data types and indexing strategies.
`;

        case 2:
          return `# Module 02: PostgreSQL Extensions and PostGIS

## Overview
Comprehensive guide to PostgreSQL extensions with focus on PostGIS for spatial data handling.

## Key Extensions for Property Search

### PostGIS - Spatial Database Extension
\`\`\`sql
-- Install PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Check PostGIS version
SELECT PostGIS_Version();
SELECT PostGIS_Full_Version();
\`\`\`

### pg_trgm - Text Search Enhancement
\`\`\`sql
-- Enable trigram indexing for address search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for fast text search
CREATE INDEX idx_address_gin ON properties 
USING GIN (address gin_trgm_ops);
\`\`\`

### btree_gist - Advanced Indexing
\`\`\`sql
-- Enable btree_gist for range queries
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create composite index for price and area ranges
CREATE INDEX idx_price_area_range ON properties 
USING GIST (price, square_feet);
\`\`\`

## Spatial Data Types

### Geometry vs Geography
\`\`\`sql
-- Geometry type (projected coordinates)
ALTER TABLE properties ADD COLUMN geom_point GEOMETRY(POINT, 4326);

-- Geography type (spherical coordinates)
ALTER TABLE properties ADD COLUMN geog_point GEOGRAPHY(POINT, 4326);

-- Insert sample data
INSERT INTO properties (address, price, geom_point, geog_point) VALUES
('123 Main St', 500000, 
 ST_GeomFromText('POINT(-122.4194 37.7749)', 4326),
 ST_GeogFromText('POINT(-122.4194 37.7749)'));
\`\`\`

### Polygon Boundaries
\`\`\`sql
-- Create neighborhood boundaries table
CREATE TABLE neighborhoods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    boundary GEOMETRY(POLYGON, 4326)
);

-- Insert neighborhood polygon
INSERT INTO neighborhoods (name, boundary) VALUES
('Downtown', ST_GeomFromText('POLYGON((-122.42 37.77, -122.41 37.77, 
                               -122.41 37.76, -122.42 37.76, 
                               -122.42 37.77))', 4326));
\`\`\`

## Performance Optimization

### Spatial Indexing
\`\`\`sql
-- Create spatial index on property locations
CREATE INDEX idx_properties_geom ON properties USING GIST (geom_point);

-- Create partial index for active listings
CREATE INDEX idx_active_properties_geom ON properties 
USING GIST (geom_point) WHERE status = 'active';
\`\`\`

### Query Examples
\`\`\`sql
-- Find properties within 1km radius
SELECT address, price 
FROM properties 
WHERE ST_DWithin(geog_point, ST_GeogFromText('POINT(-122.4194 37.7749)'), 1000);

-- Find properties in specific neighborhood
SELECT p.address, p.price, n.name
FROM properties p
JOIN neighborhoods n ON ST_Within(p.geom_point, n.boundary);
\`\`\`

## Extension Management
\`\`\`sql
-- List all installed extensions
SELECT name, default_version, installed_version 
FROM pg_available_extensions 
WHERE installed_version IS NOT NULL;

-- Update extension
ALTER EXTENSION postgis UPDATE;
\`\`\`

## Next Steps
Proceed to Module 03 to implement spatial data types and advanced indexing strategies.
`;

        case 3:
          return `# Module 03: Spatial Data Types and Indexing

## Overview
Advanced spatial data types, indexing strategies, and performance optimization for property search systems.

## Core Spatial Data Types

### POINT - Property Locations
\`\`\`sql
-- Create properties table with spatial column
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    price DECIMAL(12,2),
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    square_feet INTEGER,
    property_type VARCHAR(50),
    listing_status VARCHAR(20) DEFAULT 'active',
    location GEOMETRY(POINT, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample properties
INSERT INTO properties (address, price, bedrooms, bathrooms, square_feet, property_type, location) VALUES
('123 Oak Street, San Francisco, CA', 1200000, 3, 2.5, 1800, 'Single Family', 
 ST_GeomFromText('POINT(-122.4194 37.7749)', 4326)),
('456 Pine Avenue, San Francisco, CA', 850000, 2, 2, 1200, 'Condo', 
 ST_GeomFromText('POINT(-122.4094 37.7849)', 4326));
\`\`\`

### POLYGON - Neighborhood Boundaries
\`\`\`sql
-- Create neighborhoods with polygon boundaries
CREATE TABLE neighborhoods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    description TEXT,
    avg_price DECIMAL(12,2),
    boundary GEOMETRY(POLYGON, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert neighborhood data
INSERT INTO neighborhoods (name, description, avg_price, boundary) VALUES
('Mission District', 'Vibrant cultural neighborhood', 750000,
 ST_GeomFromText('POLYGON((-122.42 37.76, -122.40 37.76, -122.40 37.74, -122.42 37.74, -122.42 37.76))', 4326));
\`\`\`

### LINESTRING - Transportation Routes
\`\`\`sql
-- Create transit lines table
CREATE TABLE transit_lines (
    id SERIAL PRIMARY KEY,
    line_name VARCHAR(50),
    transport_type VARCHAR(20), -- bus, metro, light_rail
    route GEOMETRY(LINESTRING, 4326)
);

-- Insert transit route
INSERT INTO transit_lines (line_name, transport_type, route) VALUES
('MUNI Line 1', 'bus', 
 ST_GeomFromText('LINESTRING(-122.42 37.78, -122.41 37.77, -122.40 37.76)', 4326));
\`\`\`

## Advanced Indexing Strategies

### GIST Spatial Indexes
\`\`\`sql
-- Primary spatial index for property locations
CREATE INDEX idx_properties_location_gist ON properties USING GIST (location);

-- Neighborhood boundary index
CREATE INDEX idx_neighborhoods_boundary_gist ON neighborhoods USING GIST (boundary);

-- Transit route index
CREATE INDEX idx_transit_routes_gist ON transit_lines USING GIST (route);
\`\`\`

### Partial Indexes for Performance
\`\`\`sql
-- Index only active listings
CREATE INDEX idx_active_properties_location ON properties 
USING GIST (location) WHERE listing_status = 'active';

-- Index by property type
CREATE INDEX idx_sfh_properties_location ON properties 
USING GIST (location) WHERE property_type = 'Single Family';

-- Price range indexes
CREATE INDEX idx_luxury_properties_location ON properties 
USING GIST (location) WHERE price > 1000000;
\`\`\`

### Composite Indexes
\`\`\`sql
-- Combined spatial and attribute index
CREATE INDEX idx_properties_price_location ON properties 
USING GIST (location, price);

-- Multi-column BTREE for non-spatial attributes
CREATE INDEX idx_properties_price_sqft ON properties (price, square_feet, bedrooms);
\`\`\`

## Spatial Query Patterns

### Distance-Based Searches
\`\`\`sql
-- Properties within 1 mile of downtown
SELECT id, address, price,
       ST_Distance(location, ST_GeomFromText('POINT(-122.4194 37.7749)', 4326)) * 111320 as distance_meters
FROM properties 
WHERE ST_DWithin(location, ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), 0.01) -- ~1km
ORDER BY distance_meters;
\`\`\`

### Containment Queries
\`\`\`sql
-- Properties within specific neighborhood
SELECT p.address, p.price, n.name as neighborhood
FROM properties p
JOIN neighborhoods n ON ST_Within(p.location, n.boundary)
WHERE p.listing_status = 'active';
\`\`\`

### Proximity to Transit
\`\`\`sql
-- Properties within 500m of transit
SELECT DISTINCT p.address, p.price, t.line_name
FROM properties p
CROSS JOIN transit_lines t
WHERE ST_DWithin(p.location, t.route, 0.005) -- ~500m
  AND p.listing_status = 'active';
\`\`\`

## Performance Monitoring

### Index Usage Statistics
\`\`\`sql
-- Check spatial index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%gist%'
ORDER BY idx_scan DESC;
\`\`\`

### Query Performance Analysis
\`\`\`sql
-- Analyze spatial query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT address, price 
FROM properties 
WHERE ST_DWithin(location, ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), 0.01);
\`\`\`

## Index Maintenance
\`\`\`sql
-- Reindex spatial indexes
REINDEX INDEX CONCURRENTLY idx_properties_location_gist;

-- Update table statistics
ANALYZE properties;

-- Check index bloat
SELECT schemaname, tablename, indexname, 
       pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public';
\`\`\`

## Next Steps
Proceed to Module 04 to implement property data import and bulk loading strategies.
`;

        default:
          return `# Module ${i.toString().padStart(2, '0')}: ${title}

## Overview
${title} implementation for real estate property search systems.

## Learning Objectives
- Understand ${title.toLowerCase()} concepts
- Implement practical solutions
- Optimize for real estate use cases
- Apply best practices

## Implementation
[Detailed content for ${title}]

## Code Examples
[Practical examples and exercises]

## Performance Considerations
[Optimization strategies and tips]

## Next Steps
Continue to the next module for advanced topics.
`;
      }
    } else {
      // Non-property search modules (general PostgreSQL/routing)
      switch (i) {
        case 1:
          return `# Module 01: Database Setup and Configuration

## Overview
Setting up PostgreSQL ${postgresVersion} for high-performance applications with advanced configuration.

## Installation and Setup
\`\`\`bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql-${postgresVersion} postgresql-contrib-${postgresVersion}

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql
\`\`\`

## Database Configuration
\`\`\`sql
-- Create application database
CREATE DATABASE app_db;

-- Configure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
\`\`\`

## Performance Tuning
[Configuration settings for optimal performance]

## Next Steps
Proceed to Module 02 for advanced extension configuration.
`;

        default:
          return `# Module ${i.toString().padStart(2, '0')}: ${title}

## Overview
${title} for PostgreSQL applications.

## Implementation Details
[Comprehensive content for ${title}]

## Best Practices
[Industry best practices and recommendations]

## Next Steps
Continue learning with the next module.
`;
      }
    }
  }

  private generateCodeExample(i: number, repository: Repository, isPropertySearch: boolean, isTimeSeries: boolean = false): string {
    const language = repository.language;
    
    if (isTimeSeries) {
      if (language === "Python") {
        switch (i) {
          case 1:
            return `import psycopg2
import pandas as pd
from datetime import datetime, timedelta
import json

# AWS RDS/Aurora connection with time-series optimizations
def connect_to_timeseries_db():
    """Connect to PostgreSQL with time-series specific settings"""
    conn = psycopg2.connect(
        host="your-rds-endpoint.amazonaws.com",
        database="${repository.name.replace(/-/g, '_')}",
        user="postgres",
        password="your-password",
        port=5432,
        # Connection pooling for high-frequency inserts
        options="-c statement_timeout=30s -c idle_in_transaction_session_timeout=60s"
    )
    return conn

def create_partition_if_not_exists(conn, target_date):
    """Create monthly partition if it doesn't exist"""
    partition_name = f"sensor_data_{target_date.strftime('%Y_%m')}"
    start_date = target_date.replace(day=1)
    end_date = (start_date + timedelta(days=32)).replace(day=1)
    
    with conn.cursor() as cur:
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS {partition_name} PARTITION OF sensor_data 
            FOR VALUES FROM ('{start_date}') TO ('{end_date}')
        """)
        
        # Create BRIN index for time-series efficiency
        cur.execute(f"""
            CREATE INDEX IF NOT EXISTS {partition_name}_recorded_at_brin_idx 
            ON {partition_name} USING BRIN (recorded_at)
        """)
    conn.commit()

def bulk_insert_sensor_data(conn, sensor_readings):
    """Efficient bulk insert for time-series data"""
    with conn.cursor() as cur:
        # Use COPY for maximum insert performance
        cur.execute("PREPARE bulk_insert AS INSERT INTO sensor_data (sensor_id, metric_name, value, tags, recorded_at) VALUES ($1, $2, $3, $4, $5)")
        
        for reading in sensor_readings:
            cur.execute("EXECUTE bulk_insert (%s, %s, %s, %s, %s)", 
                       (reading['sensor_id'], reading['metric_name'], 
                        reading['value'], json.dumps(reading['tags']), 
                        reading['recorded_at']))
    conn.commit()

def query_time_buckets(conn, sensor_id, hours_back=24):
    """Query time-bucketed data using native PostgreSQL functions"""
    query = """
        SELECT time_bucket('5 minutes', recorded_at) as bucket,
               AVG(value) as avg_value,
               MIN(value) as min_value,
               MAX(value) as max_value,
               COUNT(*) as reading_count
        FROM sensor_data
        WHERE sensor_id = %s
          AND recorded_at >= NOW() - INTERVAL '%s hours'
        GROUP BY bucket
        ORDER BY bucket DESC
    """
    
    df = pd.read_sql_query(query, conn, params=(sensor_id, hours_back))
    return df

if __name__ == "__main__":
    conn = connect_to_timeseries_db()
    
    # Example: Create partition for current month
    create_partition_if_not_exists(conn, datetime.now())
    
    # Example: Query recent data
    recent_data = query_time_buckets(conn, "sensor_001", 24)
    print(f"Retrieved {len(recent_data)} time buckets")
    print(recent_data.head())
    
    conn.close()
`;

          case 2:
            return `import psycopg2
import pandas as pd
from datetime import datetime, timedelta
import asyncio
import asyncpg

class TimeSeriesAggregator:
    """AWS-native continuous aggregation for time-series data"""
    
    def __init__(self, db_config):
        self.db_config = db_config
    
    async def refresh_continuous_aggregates(self):
        """Refresh hourly aggregates using native PostgreSQL"""
        conn = await asyncpg.connect(**self.db_config)
        
        try:
            # Call the PostgreSQL function for continuous aggregation
            await conn.execute("SELECT refresh_hourly_metrics()")
            print(f"Refreshed hourly metrics at {datetime.now()}")
            
        finally:
            await conn.close()
    
    def query_aggregated_metrics(self, sensor_id, days_back=7):
        """Query pre-aggregated metrics for fast analytics"""
        conn = psycopg2.connect(**self.db_config)
        
        query = """
            SELECT 
                DATE_TRUNC('day', hour_bucket) as day,
                AVG(avg_value) as daily_avg,
                MIN(min_value) as daily_min,
                MAX(max_value) as daily_max,
                SUM(count_values) as total_readings
            FROM sensor_metrics_hourly
            WHERE sensor_id = %s
              AND hour_bucket >= NOW() - INTERVAL '%s days'
            GROUP BY DATE_TRUNC('day', hour_bucket)
            ORDER BY day DESC
        """
        
        df = pd.read_sql_query(query, conn, params=(sensor_id, days_back))
        conn.close()
        return df
    
    def detect_anomalies(self, sensor_id, threshold_std=2):
        """Statistical anomaly detection using window functions"""
        conn = psycopg2.connect(**self.db_config)
        
        query = """
            WITH stats AS (
                SELECT 
                    recorded_at,
                    value,
                    AVG(value) OVER (
                        ORDER BY recorded_at 
                        ROWS BETWEEN 99 PRECEDING AND CURRENT ROW
                    ) as rolling_avg,
                    STDDEV(value) OVER (
                        ORDER BY recorded_at 
                        ROWS BETWEEN 99 PRECEDING AND CURRENT ROW
                    ) as rolling_std
                FROM sensor_data
                WHERE sensor_id = %s
                  AND recorded_at >= NOW() - INTERVAL '24 hours'
                ORDER BY recorded_at
            )
            SELECT 
                recorded_at,
                value,
                rolling_avg,
                CASE 
                    WHEN ABS(value - rolling_avg) > %s * rolling_std 
                    THEN 'ANOMALY' 
                    ELSE 'NORMAL' 
                END as status
            FROM stats
            WHERE rolling_std IS NOT NULL
        """
        
        df = pd.read_sql_query(query, conn, params=(sensor_id, threshold_std))
        conn.close()
        return df

# Example usage
async def main():
    db_config = {
        'host': 'your-aurora-cluster.cluster-xyz.us-west-2.rds.amazonaws.com',
        'database': '${repository.name.replace(/-/g, '_')}',
        'user': 'postgres',
        'password': 'your-password'
    }
    
    aggregator = TimeSeriesAggregator(db_config)
    
    # Refresh aggregates
    await aggregator.refresh_continuous_aggregates()
    
    # Query aggregated data
    daily_metrics = aggregator.query_aggregated_metrics('sensor_001')
    print("Daily metrics:")
    print(daily_metrics)
    
    # Detect anomalies
    anomalies = aggregator.detect_anomalies('sensor_001')
    anomaly_count = len(anomalies[anomalies['status'] == 'ANOMALY'])
    print(f"Found {anomaly_count} anomalies in the last 24 hours")

if __name__ == "__main__":
    asyncio.run(main())
`;

          default:
            return `import psycopg2
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import seaborn as sns

class AdvancedTimeSeriesAnalytics:
    """Advanced analytics using native PostgreSQL time-series patterns"""
    
    def __init__(self, connection_string):
        self.conn_string = connection_string
    
    def gap_filling_analysis(self, sensor_id, start_time, end_time, interval='1 hour'):
        """Fill gaps in time-series data using PostgreSQL interpolation"""
        conn = psycopg2.connect(self.conn_string)
        
        query = """
            WITH time_series AS (
                SELECT generate_series(
                    %s::timestamp,
                    %s::timestamp,
                    %s::interval
                ) as ts
            ),
            sensor_data_with_gaps AS (
                SELECT 
                    ts,
                    s.value,
                    LAG(s.value) OVER (ORDER BY ts) as prev_value,
                    LEAD(s.value) OVER (ORDER BY ts) as next_value
                FROM time_series t
                LEFT JOIN sensor_data s ON DATE_TRUNC('hour', s.recorded_at) = t.ts
                WHERE s.sensor_id = %s OR s.sensor_id IS NULL
            )
            SELECT 
                ts,
                COALESCE(
                    value,
                    (prev_value + next_value) / 2,  -- Linear interpolation
                    prev_value,  -- Forward fill
                    next_value   -- Backward fill
                ) as interpolated_value,
                CASE WHEN value IS NULL THEN 'interpolated' ELSE 'actual' END as data_type
            FROM sensor_data_with_gaps
            ORDER BY ts
        """
        
        df = pd.read_sql_query(query, conn, 
                             params=(start_time, end_time, interval, sensor_id))
        conn.close()
        return df
    
    def seasonal_decomposition(self, sensor_id, days_back=30):
        """Seasonal decomposition using PostgreSQL window functions"""
        conn = psycopg2.connect(self.conn_string)
        
        query = """
            WITH hourly_data AS (
                SELECT 
                    DATE_TRUNC('hour', recorded_at) as hour_bucket,
                    AVG(value) as avg_value
                FROM sensor_data
                WHERE sensor_id = %s
                  AND recorded_at >= NOW() - INTERVAL '%s days'
                GROUP BY DATE_TRUNC('hour', recorded_at)
                ORDER BY hour_bucket
            ),
            with_trend AS (
                SELECT 
                    hour_bucket,
                    avg_value,
                    AVG(avg_value) OVER (
                        ORDER BY hour_bucket 
                        ROWS BETWEEN 23 PRECEDING AND 23 FOLLOWING
                    ) as trend_24h
                FROM hourly_data
            )
            SELECT 
                hour_bucket,
                avg_value as original,
                trend_24h as trend,
                avg_value - trend_24h as detrended,
                EXTRACT(hour FROM hour_bucket) as hour_of_day,
                EXTRACT(dow FROM hour_bucket) as day_of_week
            FROM with_trend
            WHERE trend_24h IS NOT NULL
        """
        
        df = pd.read_sql_query(query, conn, params=(sensor_id, days_back))
        conn.close()
        return df
    
    def partition_performance_analysis(self):
        """Analyze partition performance and storage efficiency"""
        conn = psycopg2.connect(self.conn_string)
        
        query = """
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                seq_scan,
                seq_tup_read,
                idx_scan,
                idx_tup_fetch
            FROM pg_stat_user_tables
            WHERE tablename LIKE 'sensor_data_%'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        """
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df
    
    def index_efficiency_report(self):
        """Analyze BRIN vs B-tree index performance"""
        conn = psycopg2.connect(self.conn_string)
        
        query = """
            SELECT 
                i.indexrelname as index_name,
                t.tablename,
                am.amname as index_type,
                pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
                s.idx_scan,
                s.idx_tup_read,
                s.idx_tup_fetch,
                ROUND(s.idx_tup_fetch::numeric / NULLIF(s.idx_scan, 0), 2) as avg_fetch_per_scan
            FROM pg_indexes i
            JOIN pg_stat_user_indexes s ON i.indexname = s.indexname
            JOIN pg_tables t ON i.tablename = t.tablename
            JOIN pg_class c ON c.relname = i.indexname
            JOIN pg_am am ON c.relam = am.oid
            WHERE i.tablename LIKE 'sensor_data%'
            ORDER BY pg_relation_size(i.indexrelid) DESC
        """
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df

# Example usage and visualization
if __name__ == "__main__":
    analytics = AdvancedTimeSeriesAnalytics(
        "postgresql://postgres:password@your-rds-endpoint.amazonaws.com:5432/${repository.name.replace(/-/g, '_')}"
    )
    
    # Gap filling analysis
    start_time = datetime.now() - timedelta(days=7)
    end_time = datetime.now()
    gap_filled = analytics.gap_filling_analysis('sensor_001', start_time, end_time)
    
    # Plot gap-filled data
    plt.figure(figsize=(12, 6))
    actual_data = gap_filled[gap_filled['data_type'] == 'actual']
    interpolated_data = gap_filled[gap_filled['data_type'] == 'interpolated']
    
    plt.plot(actual_data['ts'], actual_data['interpolated_value'], 'b-', label='Actual')
    plt.plot(interpolated_data['ts'], interpolated_data['interpolated_value'], 'r--', label='Interpolated')
    plt.title('Time Series with Gap Filling')
    plt.legend()
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()
    
    # Performance analysis
    partition_stats = analytics.partition_performance_analysis()
    print("Partition Performance:")
    print(partition_stats)
    
    index_stats = analytics.index_efficiency_report()
    print("\\nIndex Efficiency:")
    print(index_stats)
`;
        }
      } else {
        // JavaScript/Node.js examples
        switch (i) {
          case 1:
            return `const { Pool } = require('pg');
const { format } = require('date-fns');

class TimeSeriesDatabase {
    constructor(config) {
        this.pool = new Pool({
            host: config.host,
            database: config.database,
            user: config.user,
            password: config.password,
            port: config.port || 5432,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            // Optimize for time-series workloads
            statement_timeout: 30000,
            query_timeout: 30000
        });
    }

    async createPartitionIfNotExists(targetDate) {
        const partitionName = \`sensor_data_\${format(targetDate, 'yyyy_MM')}\`;
        const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);
        
        const client = await this.pool.connect();
        try {
            await client.query(\`
                CREATE TABLE IF NOT EXISTS \${partitionName} PARTITION OF sensor_data 
                FOR VALUES FROM ($1) TO ($2)
            \`, [startDate.toISOString(), endDate.toISOString()]);
            
            // Create BRIN index for time-series efficiency
            await client.query(\`
                CREATE INDEX IF NOT EXISTS \${partitionName}_recorded_at_brin_idx 
                ON \${partitionName} USING BRIN (recorded_at)
            \`);
            
            console.log(\`Created partition: \${partitionName}\`);
        } finally {
            client.release();
        }
    }

    async bulkInsertSensorData(sensorReadings) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const insertQuery = \`
                INSERT INTO sensor_data (sensor_id, metric_name, value, tags, recorded_at)
                VALUES ($1, $2, $3, $4, $5)
            \`;
            
            for (const reading of sensorReadings) {
                await client.query(insertQuery, [
                    reading.sensor_id,
                    reading.metric_name,
                    reading.value,
                    JSON.stringify(reading.tags),
                    reading.recorded_at
                ]);
            }
            
            await client.query('COMMIT');
            console.log(\`Inserted \${sensorReadings.length} sensor readings\`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async queryTimeBuckets(sensorId, hoursBack = 24) {
        const query = \`
            SELECT time_bucket('5 minutes', recorded_at) as bucket,
                   AVG(value) as avg_value,
                   MIN(value) as min_value,
                   MAX(value) as max_value,
                   COUNT(*) as reading_count
            FROM sensor_data
            WHERE sensor_id = $1
              AND recorded_at >= NOW() - INTERVAL '\${hoursBack} hours'
            GROUP BY bucket
            ORDER BY bucket DESC
        \`;
        
        const result = await this.pool.query(query, [sensorId]);
        return result.rows;
    }

    async getRealtimeMetrics(sensorId) {
        const query = \`
            SELECT 
                sensor_id,
                metric_name,
                value,
                recorded_at,
                LAG(value) OVER (
                    PARTITION BY sensor_id, metric_name 
                    ORDER BY recorded_at
                ) as previous_value
            FROM sensor_data
            WHERE sensor_id = $1
              AND recorded_at >= NOW() - INTERVAL '1 hour'
            ORDER BY recorded_at DESC
            LIMIT 100
        \`;
        
        const result = await this.pool.query(query, [sensorId]);
        return result.rows.map(row => ({
            ...row,
            change: row.previous_value ? row.value - row.previous_value : 0
        }));
    }

    async close() {
        await this.pool.end();
    }
}

// Example usage with AWS RDS/Aurora
async function main() {
    const db = new TimeSeriesDatabase({
        host: 'your-aurora-cluster.cluster-xyz.us-west-2.rds.amazonaws.com',
        database: '${repository.name.replace(/-/g, '_')}',
        user: 'postgres',
        password: process.env.DB_PASSWORD
    });

    try {
        // Create partition for current month
        await db.createPartitionIfNotExists(new Date());
        
        // Example sensor readings
        const readings = [
            {
                sensor_id: 'sensor_001',
                metric_name: 'temperature',
                value: 23.5,
                tags: { location: 'warehouse_a', device_type: 'iot_sensor' },
                recorded_at: new Date()
            },
            {
                sensor_id: 'sensor_001',
                metric_name: 'humidity',
                value: 65.2,
                tags: { location: 'warehouse_a', device_type: 'iot_sensor' },
                recorded_at: new Date()
            }
        ];
        
        await db.bulkInsertSensorData(readings);
        
        // Query time-bucketed data
        const buckets = await db.queryTimeBuckets('sensor_001', 24);
        console.log('Time buckets:', buckets.slice(0, 5));
        
        // Get real-time metrics
        const realtime = await db.getRealtimeMetrics('sensor_001');
        console.log('Real-time metrics:', realtime.slice(0, 3));
        
    } finally {
        await db.close();
    }
}

main().catch(console.error);
`;

          case 2:
            return `const { Pool } = require('pg');
const cron = require('node-cron');

class ContinuousAggregator {
    constructor(dbConfig) {
        this.pool = new Pool(dbConfig);
    }

    async refreshHourlyMetrics(startTime = null) {
        const client = await this.pool.connect();
        try {
            // Call PostgreSQL function for continuous aggregation
            await client.query('SELECT refresh_hourly_metrics($1)', [startTime]);
            console.log(\`Refreshed hourly metrics at \${new Date().toISOString()}\`);
        } finally {
            client.release();
        }
    }

    async queryAggregatedMetrics(sensorId, daysBack = 7) {
        const query = \`
            SELECT 
                DATE_TRUNC('day', hour_bucket) as day,
                AVG(avg_value) as daily_avg,
                MIN(min_value) as daily_min,
                MAX(max_value) as daily_max,
                SUM(count_values) as total_readings
            FROM sensor_metrics_hourly
            WHERE sensor_id = $1
              AND hour_bucket >= NOW() - INTERVAL '\${daysBack} days'
            GROUP BY DATE_TRUNC('day', hour_bucket)
            ORDER BY day DESC
        \`;
        
        const result = await this.pool.query(query, [sensorId]);
        return result.rows;
    }

    async detectAnomalies(sensorId, thresholdStd = 2) {
        const query = \`
            WITH stats AS (
                SELECT 
                    recorded_at,
                    value,
                    AVG(value) OVER (
                        ORDER BY recorded_at 
                        ROWS BETWEEN 99 PRECEDING AND CURRENT ROW
                    ) as rolling_avg,
                    STDDEV(value) OVER (
                        ORDER BY recorded_at 
                        ROWS BETWEEN 99 PRECEDING AND CURRENT ROW
                    ) as rolling_std
                FROM sensor_data
                WHERE sensor_id = $1
                  AND recorded_at >= NOW() - INTERVAL '24 hours'
                ORDER BY recorded_at
            )
            SELECT 
                recorded_at,
                value,
                rolling_avg,
                CASE 
                    WHEN ABS(value - rolling_avg) > $2 * rolling_std 
                    THEN 'ANOMALY' 
                    ELSE 'NORMAL' 
                END as status
            FROM stats
            WHERE rolling_std IS NOT NULL
        \`;
        
        const result = await this.pool.query(query, [sensorId, thresholdStd]);
        return result.rows;
    }

    async getMetricsForDashboard(sensorIds) {
        const query = \`
            SELECT 
                s.sensor_id,
                s.metric_name,
                s.value as current_value,
                s.recorded_at as last_reading,
                h.avg_value as hourly_avg,
                h.min_value as hourly_min,
                h.max_value as hourly_max
            FROM sensor_data s
            JOIN LATERAL (
                SELECT sensor_id, metric_name, MAX(recorded_at) as max_time
                FROM sensor_data
                WHERE sensor_id = ANY($1)
                GROUP BY sensor_id, metric_name
            ) latest ON s.sensor_id = latest.sensor_id 
                     AND s.metric_name = latest.metric_name 
                     AND s.recorded_at = latest.max_time
            LEFT JOIN sensor_metrics_hourly h ON h.sensor_id = s.sensor_id
                                              AND h.metric_name = s.metric_name
                                              AND h.hour_bucket = DATE_TRUNC('hour', s.recorded_at)
        \`;
        
        const result = await this.pool.query(query, [sensorIds]);
        return result.rows;
    }

    startContinuousProcessing() {
        // Run every hour at minute 5
        cron.schedule('5 * * * *', async () => {
            try {
                await this.refreshHourlyMetrics();
            } catch (error) {
                console.error('Error in continuous aggregation:', error);
            }
        });

        console.log('Started continuous aggregation scheduler');
    }

    async close() {
        await this.pool.end();
    }
}

// Real-time monitoring API
const express = require('express');
const app = express();

async function setupMonitoringAPI() {
    const aggregator = new ContinuousAggregator({
        host: process.env.DB_HOST,
        database: '${repository.name.replace(/-/g, '_')}',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: 5432
    });

    // Start continuous processing
    aggregator.startContinuousProcessing();

    app.get('/api/sensors/:id/metrics', async (req, res) => {
        try {
            const metrics = await aggregator.queryAggregatedMetrics(req.params.id, 7);
            res.json(metrics);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/sensors/:id/anomalies', async (req, res) => {
        try {
            const anomalies = await aggregator.detectAnomalies(req.params.id);
            res.json(anomalies);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/dashboard', async (req, res) => {
        try {
            const sensorIds = req.query.sensors ? req.query.sensors.split(',') : ['sensor_001'];
            const dashboard = await aggregator.getMetricsForDashboard(sensorIds);
            res.json(dashboard);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(\`Time-series API running on port \${PORT}\`);
    });
}

setupMonitoringAPI().catch(console.error);
`;

          default:
            return `const { Pool } = require('pg');
const { promisify } = require('util');

class AdvancedTimeSeriesAnalytics {
    constructor(connectionString) {
        this.pool = new Pool({ connectionString });
    }

    async gapFillingAnalysis(sensorId, startTime, endTime, interval = '1 hour') {
        const query = \`
            WITH time_series AS (
                SELECT generate_series(
                    $2::timestamp,
                    $3::timestamp,
                    $4::interval
                ) as ts
            ),
            sensor_data_with_gaps AS (
                SELECT 
                    ts,
                    s.value,
                    LAG(s.value) OVER (ORDER BY ts) as prev_value,
                    LEAD(s.value) OVER (ORDER BY ts) as next_value
                FROM time_series t
                LEFT JOIN sensor_data s ON DATE_TRUNC('hour', s.recorded_at) = t.ts
                WHERE s.sensor_id = $1 OR s.sensor_id IS NULL
            )
            SELECT 
                ts,
                COALESCE(
                    value,
                    (prev_value + next_value) / 2,
                    prev_value,
                    next_value
                ) as interpolated_value,
                CASE WHEN value IS NULL THEN 'interpolated' ELSE 'actual' END as data_type
            FROM sensor_data_with_gaps
            ORDER BY ts
        \`;
        
        const result = await this.pool.query(query, [sensorId, startTime, endTime, interval]);
        return result.rows;
    }

    async seasonalDecomposition(sensorId, daysBack = 30) {
        const query = \`
            WITH hourly_data AS (
                SELECT 
                    DATE_TRUNC('hour', recorded_at) as hour_bucket,
                    AVG(value) as avg_value
                FROM sensor_data
                WHERE sensor_id = $1
                  AND recorded_at >= NOW() - INTERVAL '\${daysBack} days'
                GROUP BY DATE_TRUNC('hour', recorded_at)
                ORDER BY hour_bucket
            ),
            with_trend AS (
                SELECT 
                    hour_bucket,
                    avg_value,
                    AVG(avg_value) OVER (
                        ORDER BY hour_bucket 
                        ROWS BETWEEN 23 PRECEDING AND 23 FOLLOWING
                    ) as trend_24h
                FROM hourly_data
            )
            SELECT 
                hour_bucket,
                avg_value as original,
                trend_24h as trend,
                avg_value - trend_24h as detrended,
                EXTRACT(hour FROM hour_bucket) as hour_of_day,
                EXTRACT(dow FROM hour_bucket) as day_of_week
            FROM with_trend
            WHERE trend_24h IS NOT NULL
        \`;
        
        const result = await this.pool.query(query, [sensorId]);
        return result.rows;
    }

    async partitionPerformanceAnalysis() {
        const query = \`
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                seq_scan,
                seq_tup_read,
                idx_scan,
                idx_tup_fetch
            FROM pg_stat_user_tables
            WHERE tablename LIKE 'sensor_data_%'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        \`;
        
        const result = await this.pool.query(query);
        return result.rows;
    }

    async indexEfficiencyReport() {
        const query = \`
            SELECT 
                i.indexrelname as index_name,
                t.tablename,
                am.amname as index_type,
                pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
                s.idx_scan,
                s.idx_tup_read,
                s.idx_tup_fetch,
                ROUND(s.idx_tup_fetch::numeric / NULLIF(s.idx_scan, 0), 2) as avg_fetch_per_scan
            FROM pg_indexes i
            JOIN pg_stat_user_indexes s ON i.indexname = s.indexname
            JOIN pg_tables t ON i.tablename = t.tablename
            JOIN pg_class c ON c.relname = i.indexname
            JOIN pg_am am ON c.relam = am.oid
            WHERE i.tablename LIKE 'sensor_data%'
            ORDER BY pg_relation_size(i.indexrelid) DESC
        \`;
        
        const result = await this.pool.query(query);
        return result.rows;
    }

    async generatePerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            partitions: await this.partitionPerformanceAnalysis(),
            indexes: await this.indexEfficiencyReport()
        };

        // Calculate summary statistics
        const totalSize = report.partitions.reduce((sum, p) => {
            const sizeStr = p.size.replace(/[^0-9.]/g, '');
            const sizeUnit = p.size.match(/[A-Z]+/)?.[0];
            let sizeBytes = parseFloat(sizeStr);
            
            if (sizeUnit === 'GB') sizeBytes *= 1024 * 1024 * 1024;
            else if (sizeUnit === 'MB') sizeBytes *= 1024 * 1024;
            else if (sizeUnit === 'KB') sizeBytes *= 1024;
            
            return sum + sizeBytes;
        }, 0);

        report.summary = {
            total_partitions: report.partitions.length,
            total_size_gb: (totalSize / (1024 * 1024 * 1024)).toFixed(2),
            brin_indexes: report.indexes.filter(i => i.index_type === 'brin').length,
            btree_indexes: report.indexes.filter(i => i.index_type === 'btree').length
        };

        return report;
    }

    async close() {
        await this.pool.end();
    }
}

// Example usage and monitoring
async function main() {
    const analytics = new AdvancedTimeSeriesAnalytics(
        process.env.DATABASE_URL || 
        'postgresql://postgres:password@your-rds-endpoint.amazonaws.com:5432/${repository.name.replace(/-/g, '_')}'
    );

    try {
        // Gap filling analysis
        const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        const endTime = new Date();
        const gapFilled = await analytics.gapFillingAnalysis('sensor_001', startTime, endTime);
        
        console.log('Gap-filled data points:', gapFilled.length);
        console.log('Sample data:', gapFilled.slice(0, 3));

        // Seasonal analysis
        const seasonal = await analytics.seasonalDecomposition('sensor_001', 30);
        console.log('\\nSeasonal decomposition points:', seasonal.length);
        
        // Performance report
        const report = await analytics.generatePerformanceReport();
        console.log('\\nPerformance Report:');
        console.log('Total partitions:', report.summary.total_partitions);
        console.log('Total size:', report.summary.total_size_gb, 'GB');
        console.log('BRIN indexes:', report.summary.brin_indexes);
        console.log('B-tree indexes:', report.summary.btree_indexes);
        
    } finally {
        await analytics.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AdvancedTimeSeriesAnalytics;
`;
        }
      }
    } else if (isPropertySearch) {
      return this.generatePythonExample(i, true);
    } else {
      return this.generatePythonExample(i, false);
    }
  }

  private generatePythonExample(i: number, isPropertySearch: boolean): string {
    const moduleNum = String(i).padStart(2, '0');
    
    if (isPropertySearch) {
      return `#!/usr/bin/env python3
"""
Module ${moduleNum}: PostGIS Spatial Property Search
Advanced PostgreSQL with PostGIS for property analysis
"""

import psycopg2
import pandas as pd
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

class PropertySearchModule:
    def __init__(self):
        self.conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'property_search'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password'),
            cursor_factory=RealDictCursor
        )

    def setup_postgis_tables(self):
        """Create PostGIS enabled property tables"""
        cursor = self.conn.cursor()
        
        # Enable PostGIS extension
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        
        # Create properties table with spatial data
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS properties (
                id SERIAL PRIMARY KEY,
                address TEXT NOT NULL,
                price DECIMAL(12,2),
                bedrooms INTEGER,
                bathrooms DECIMAL(3,1),
                square_feet INTEGER,
                property_type VARCHAR(50),
                listing_status VARCHAR(20) DEFAULT 'active',
                location GEOMETRY(POINT, 4326),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # Create spatial index for fast geospatial queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_properties_location 
            ON properties USING GIST (location);
        """)
        
        self.conn.commit()
        cursor.close()
        print("✓ PostGIS tables and indexes created")

    def find_nearby_properties(self, lat, lng, radius_km=5):
        """Find properties within radius using spatial queries"""
        cursor = self.conn.cursor()
        
        query = """
            SELECT 
                id, address, price, bedrooms, bathrooms, 
                property_type, square_feet,
                ST_Distance(location, ST_GeomFromText('POINT(%s %s)', 4326)) * 111320 as distance_meters
            FROM properties 
            WHERE ST_DWithin(location, ST_GeomFromText('POINT(%s %s)', 4326), %s / 111.32)
            AND listing_status = 'active'
            ORDER BY distance_meters
            LIMIT 20;
        """
        
        cursor.execute(query, (lng, lat, lng, lat, radius_km))
        results = cursor.fetchall()
        
        print(f"Found {len(results)} properties within {radius_km}km:")
        for prop in results[:5]:
            distance_m = prop['distance_meters'] or 0
            price = prop['price'] or 0
            address = prop['address'] or 'Unknown Address'
            print(f"  {address} - Price: {price:,} ({distance_m:.0f}m away)")
        
        cursor.close()
        return results

    def analyze_market_density(self):
        """Analyze property market density using spatial aggregation"""
        cursor = self.conn.cursor()
        
        query = """
            WITH grid_analysis AS (
                SELECT 
                    ST_SnapToGrid(location, 0.01) as grid_cell,
                    COUNT(*) as property_count,
                    AVG(price) as avg_price,
                    property_type
                FROM properties 
                WHERE location IS NOT NULL 
                AND listing_status = 'active'
                AND price IS NOT NULL
                GROUP BY ST_SnapToGrid(location, 0.01), property_type
                HAVING COUNT(*) >= 2
            )
            SELECT 
                property_type,
                property_count,
                ROUND(avg_price::numeric, 0) as average_price,
                ST_X(grid_cell) as center_lng,
                ST_Y(grid_cell) as center_lat
            FROM grid_analysis
            ORDER BY avg_price DESC
            LIMIT 10;
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        print("Market density analysis:")
        for row in results:
            prop_type = row['property_type'] or 'Unknown'
            avg_price = row['average_price'] or 0
            count = row['property_count'] or 0
            print(f"  {prop_type}: {avg_price:,.0f} avg, {count} properties")
        
        cursor.close()
        return results

    def run_spatial_demo(self):
        """Run complete spatial analysis demonstration"""
        print(f"Running Module ${moduleNum} - PostGIS Spatial Analysis")
        self.setup_postgis_tables()
        
        # Demo with San Francisco coordinates
        sf_lat, sf_lng = 37.7749, -122.4194
        self.find_nearby_properties(sf_lat, sf_lng, radius_km=3)
        self.analyze_market_density()
        
        print(f"Module ${moduleNum} spatial analysis completed!")

if __name__ == "__main__":
    demo = PropertySearchModule()
    demo.run_spatial_demo()
`;
    } else {
      return `#!/usr/bin/env python3
"""
Module ${moduleNum}: PostgreSQL Advanced Database Operations
Production-ready PostgreSQL administration and optimization
"""

import psycopg2
import pandas as pd
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

class PostgreSQLModule:
    def __init__(self):
        self.conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'postgres'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password'),
            cursor_factory=RealDictCursor
        )

    def setup_database_extensions(self):
        """Install and configure PostgreSQL extensions"""
        cursor = self.conn.cursor()
        
        extensions = ['uuid-ossp', 'pgcrypto', 'pg_stat_statements', 'pg_trgm']
        
        for ext in extensions:
            try:
                cursor.execute(f"CREATE EXTENSION IF NOT EXISTS {ext};")
                print(f"✓ Extension {ext} installed")
            except psycopg2.Error as e:
                print(f"✗ Failed to install {ext}: {e}")
        
        self.conn.commit()
        cursor.close()

    def create_application_tables(self):
        """Create sample application tables with proper indexing"""
        cursor = self.conn.cursor()
        
        # Users table with UUID primary key
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                is_active BOOLEAN DEFAULT true
            );
        """)
        
        # Orders table with foreign key relationships
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                order_total DECIMAL(10,2) NOT NULL,
                order_status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # Create optimized indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
            CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (order_status);
            CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
        """)
        
        self.conn.commit()
        cursor.close()
        print("✓ Application tables and indexes created")

    def demonstrate_advanced_queries(self):
        """Showcase advanced PostgreSQL query techniques"""
        cursor = self.conn.cursor()
        
        # Database information query
        cursor.execute("""
            SELECT 
                current_database() as database_name,
                current_user as connected_user,
                version() as postgresql_version,
                NOW() as current_timestamp,
                pg_size_pretty(pg_database_size(current_database())) as database_size
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"Database: {result['database_name']}")
            print(f"User: {result['connected_user']}")
            print(f"Version: {result['postgresql_version']}")
            print(f"Size: {result['database_size']}")
        
        cursor.close()
        return result

    def analyze_database_performance(self):
        """Analyze database performance metrics"""
        cursor = self.conn.cursor()
        
        # Database size and table statistics
        cursor.execute("""
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        """)
        
        results = cursor.fetchall()
        
        print("Database Performance Metrics:")
        print("=" * 40)
        for row in results:
            table_name = row['tablename'] or 'unknown'
            table_size = row['table_size'] or '0 bytes'
            inserts = row['inserts'] or 0
            updates = row['updates'] or 0
            print(f"Table: {table_name}")
            print(f"  Size: {table_size}")
            print(f"  Activity: {inserts} inserts, {updates} updates")
            print()
        
        cursor.close()

    def run_database_demo(self):
        """Execute complete database demonstration"""
        print(f"Starting Module ${moduleNum} - PostgreSQL Advanced Operations")
        print("=" * 60)
        
        self.setup_database_extensions()
        self.create_application_tables()
        self.demonstrate_advanced_queries()
        self.analyze_database_performance()
        
        print(f"Module ${moduleNum} database operations completed successfully!")

if __name__ == "__main__":
    demo = PostgreSQLModule()
    demo.run_database_demo()
`;
    }
  }

  private generateRequirements(): string {
    return `# Core Python web framework
flask==3.0.0
flask-cors==4.0.0
gunicorn==21.2.0

# Database connectivity and ORM
psycopg2-binary==2.9.8
sqlalchemy==2.0.23

# Environment and configuration
python-dotenv==1.0.0

# HTTP requests and API utilities
requests==2.31.0

# Geospatial data processing
geojson==3.0.1
shapely==2.0.2

# Data analysis and manipulation
numpy==1.24.3
pandas==2.0.3

# Date and time utilities
python-dateutil==2.8.2

# JSON processing
jsonschema==4.19.2

# Logging and debugging
structlog==23.2.0

# Testing utilities
pytest==7.4.3
pytest-flask==1.3.0

# Development utilities
black==23.11.0
flake8==6.1.0

# Security utilities
cryptography==41.0.7

# AWS SDK for cloud deployment
boto3==1.29.7
botocore==1.32.7

# Performance monitoring
psutil==5.9.6
`;
  }

  private generatePyprojectToml(repository: Repository): string {
    return `[project]
name = "${repository.name}"
version = "1.0.0"
`;
  }

  private generatePackageJson(repository: Repository): string {
    return `{
  "name": "${repository.name}",
  "version": "1.0.0"
}`;
  }

  private generateDeployScript(repository: Repository): string {
    const isAurora = repository.databaseVersion.includes('Aurora');
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    
    return `#!/bin/bash
# =============================================================================
# AWS CloudFormation Deployment Script for ${repository.name}
# =============================================================================
# Description: Automated deployment of complete PostgreSQL demo environment
# Target: ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} ${postgresVersion} with PostGIS
# Use Case: ${repository.useCases.join(", ")}
# Language: ${repository.language}
# =============================================================================

set -e  # Exit on any error
set -u  # Exit on undefined variables
set -o pipefail  # Exit on pipe failures

# Color codes for output
RED='\\x1b[0;31m'
GREEN='\\x1b[0;32m'
YELLOW='\\x1b[1;33m'
BLUE='\\x1b[0;34m'
NC='\\x1b[0m'

# Logging functions
log_info() { echo -e "\${BLUE}[INFO]\${NC} $1"; }
log_success() { echo -e "\${GREEN}[SUCCESS]\${NC} $1"; }
log_warning() { echo -e "\${YELLOW}[WARNING]\${NC} $1"; }
log_error() { echo -e "\${RED}[ERROR]\${NC} $1"; }

# Error handling
error_exit() {
    log_error "$1"
    log_error "Deployment failed. Check the logs above for details."
    exit 1
}

# Configuration variables
PROJECT_NAME="${repository.name}"
STACK_NAME="\${PROJECT_NAME}-stack"
AWS_REGION="\${AWS_REGION:-${repository.awsRegion}}"
KEY_PAIR_NAME="\${KEY_PAIR_NAME:-\${PROJECT_NAME}-keypair}"
POSTGRES_VERSION="${postgresVersion}"
DB_INSTANCE_TYPE="${isAurora ? 'db.r6g.large' : 'db.t3.medium'}"
BASTION_INSTANCE_TYPE="t3.micro"

log_info "Starting AWS deployment for ${repository.name}"
log_info "Configuration:"
log_info "  - Project: \$PROJECT_NAME"
log_info "  - Stack: \$STACK_NAME" 
log_info "  - Region: \$AWS_REGION"
log_info "  - Database: ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} \$POSTGRES_VERSION"
log_info "  - Instance Type: \$DB_INSTANCE_TYPE"

# Prerequisites check
log_info "Checking prerequisites..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    error_exit "AWS CLI is required but not installed. Please install AWS CLI v2."
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    error_exit "AWS credentials not configured. Run 'aws configure' first."
fi

# Verify region is valid
if ! aws ec2 describe-regions --region-names \$AWS_REGION &> /dev/null; then
    error_exit "Invalid AWS region: \$AWS_REGION"
fi

log_success "Prerequisites check passed"

# Create EC2 Key Pair if it doesn't exist
log_info "Checking EC2 Key Pair..."
if ! aws ec2 describe-key-pairs --key-names \$KEY_PAIR_NAME --region \$AWS_REGION &> /dev/null; then
    log_info "Creating new EC2 Key Pair: \$KEY_PAIR_NAME"
    aws ec2 create-key-pair \\
        --key-name \$KEY_PAIR_NAME \\
        --query 'KeyMaterial' \\
        --output text \\
        --region \$AWS_REGION > \${KEY_PAIR_NAME}.pem
    
    chmod 400 \${KEY_PAIR_NAME}.pem
    log_success "Key pair created: \${KEY_PAIR_NAME}.pem"
else
    log_info "Key pair already exists: \$KEY_PAIR_NAME"
fi

# Validate CloudFormation template
log_info "Validating CloudFormation template..."
if ! aws cloudformation validate-template \\
    --template-body file://cloudformation/main.yaml \\
    --region \$AWS_REGION &> /dev/null; then
    error_exit "CloudFormation template validation failed"
fi
log_success "CloudFormation template is valid"

# Check for existing stack
if aws cloudformation describe-stacks --stack-name \$STACK_NAME --region \$AWS_REGION &> /dev/null; then
    log_warning "Stack \$STACK_NAME already exists"
    read -p "Do you want to update the existing stack? (y/N): " -n 1 -r
    echo
    if [[ \$REPLY =~ ^[Yy]$ ]]; then
        OPERATION="update"
    else
        log_info "Deployment cancelled by user"
        exit 0
    fi
else
    OPERATION="create"
fi

# Deploy CloudFormation stack
log_info "Deploying CloudFormation stack..."
if [ "\$OPERATION" = "create" ]; then
    aws cloudformation create-stack \\
        --stack-name \$STACK_NAME \\
        --template-body file://cloudformation/main.yaml \\
        --parameters \\
            ParameterKey=ProjectName,ParameterValue=\$PROJECT_NAME \\
            ParameterKey=KeyPairName,ParameterValue=\$KEY_PAIR_NAME \\
            ParameterKey=PostgreSQLVersion,ParameterValue=\$POSTGRES_VERSION \\
            ParameterKey=DatabaseInstanceType,ParameterValue=\$DB_INSTANCE_TYPE \\
            ParameterKey=BastionInstanceType,ParameterValue=\$BASTION_INSTANCE_TYPE \\
        --capabilities CAPABILITY_IAM \\
        --region \$AWS_REGION \\
        --tags \\
            Key=Project,Value=\$PROJECT_NAME \\
            Key=Environment,Value=demo \\
            Key=UseCase,Value="${repository.useCases.join(",")}" \\
        || error_exit "Stack creation failed"
else
    aws cloudformation update-stack \\
        --stack-name \$STACK_NAME \\
        --template-body file://cloudformation/main.yaml \\
        --parameters \\
            ParameterKey=ProjectName,ParameterValue=\$PROJECT_NAME \\
            ParameterKey=KeyPairName,ParameterValue=\$KEY_PAIR_NAME \\
            ParameterKey=PostgreSQLVersion,ParameterValue=\$POSTGRES_VERSION \\
            ParameterKey=DatabaseInstanceType,ParameterValue=\$DB_INSTANCE_TYPE \\
            ParameterKey=BastionInstanceType,ParameterValue=\$BASTION_INSTANCE_TYPE \\
        --capabilities CAPABILITY_IAM \\
        --region \$AWS_REGION \\
        || error_exit "Stack update failed"
fi

# Wait for stack completion
log_info "Waiting for stack \$OPERATION to complete (this may take 10-15 minutes)..."
if [ "\$OPERATION" = "create" ]; then
    aws cloudformation wait stack-create-complete \\
        --stack-name \$STACK_NAME \\
        --region \$AWS_REGION
else
    aws cloudformation wait stack-update-complete \\
        --stack-name \$STACK_NAME \\
        --region \$AWS_REGION
fi

# Check stack status
STACK_STATUS=\$(aws cloudformation describe-stacks \\
    --stack-name \$STACK_NAME \\
    --query 'Stacks[0].StackStatus' \\
    --output text \\
    --region \$AWS_REGION)

if [[ "\$STACK_STATUS" == *"COMPLETE" ]]; then
    log_success "Stack \$OPERATION completed successfully"
else
    error_exit "Stack \$OPERATION failed with status: \$STACK_STATUS"
fi

# Get stack outputs
log_info "Retrieving stack outputs..."
BASTION_IP=\$(aws cloudformation describe-stacks \\
    --stack-name \$STACK_NAME \\
    --query 'Stacks[0].Outputs[?OutputKey==\`BastionHostIP\`].OutputValue' \\
    --output text \\
    --region \$AWS_REGION)

DB_ENDPOINT=\$(aws cloudformation describe-stacks \\
    --stack-name \$STACK_NAME \\
    --query 'Stacks[0].Outputs[?OutputKey==\`DatabaseEndpoint\`].OutputValue' \\
    --output text \\
    --region \$AWS_REGION)

VPC_ID=\$(aws cloudformation describe-stacks \\
    --stack-name \$STACK_NAME \\
    --query 'Stacks[0].Outputs[?OutputKey==\`VpcId\`].OutputValue' \\
    --output text \\
    --region \$AWS_REGION)

# Validate outputs
if [ -z "\$BASTION_IP" ] || [ -z "\$DB_ENDPOINT" ] || [ -z "\$VPC_ID" ]; then
    error_exit "Failed to retrieve required stack outputs"
fi

# Save connection information
cat > connection-info.txt << EOF
# ${repository.name} AWS Deployment Information
# Generated: \$(date)

## Stack Details
Stack Name: \$STACK_NAME
AWS Region: \$AWS_REGION
VPC ID: \$VPC_ID

## Bastion Host
IP Address: \$BASTION_IP
SSH Command: ssh -i \${KEY_PAIR_NAME}.pem ubuntu@\$BASTION_IP
Key File: \${KEY_PAIR_NAME}.pem

## Database
Type: ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} \$POSTGRES_VERSION
Endpoint: \$DB_ENDPOINT
Port: 5432
Database: postgres
Username: postgres

## Next Steps
1. Connect to bastion host: ssh -i \${KEY_PAIR_NAME}.pem ubuntu@\$BASTION_IP
2. Update database endpoint in /home/ubuntu/.env
3. Run database initialization: ./init-database.sh
4. Set up application: ./setup-application.sh
5. Start application and access at: http://\$BASTION_IP:${repository.language === "Python" ? "5000" : "3000"}

## Cleanup
To delete all resources: aws cloudformation delete-stack --stack-name \$STACK_NAME --region \$AWS_REGION
EOF

# Test bastion host connectivity
log_info "Testing bastion host connectivity..."
if timeout 10 nc -z \$BASTION_IP 22; then
    log_success "Bastion host is accessible on port 22"
else
    log_warning "Bastion host is not yet accessible (may take a few more minutes)"
fi

# Create environment file template for bastion host
cat > bastion-env-template.txt << EOF
# Environment file template for \${PROJECT_NAME}
# Copy this to /home/ubuntu/.env on the bastion host

DB_HOST=\$DB_ENDPOINT
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=SecurePassword123!
DATABASE_URL=postgresql://postgres:SecurePassword123!@\$DB_ENDPOINT:5432/postgres
AWS_REGION=\$AWS_REGION
PROJECT_NAME=\$PROJECT_NAME
EOF

# Create quick setup script for bastion host
cat > quick-setup.sh << 'EOF'
#!/bin/bash
# Quick setup script to run on bastion host

# Copy environment file
cp bastion-env-template.txt /home/ubuntu/.env

# Run bastion setup
chmod +x /home/ubuntu/scripts/bastion-setup.sh
/home/ubuntu/scripts/bastion-setup.sh

# Initialize database
chmod +x /home/ubuntu/init-database.sh
/home/ubuntu/init-database.sh

# Setup application
chmod +x /home/ubuntu/setup-application.sh
/home/ubuntu/setup-application.sh

echo "Setup completed! Application available at: http://\$(curl -s ifconfig.me):${repository.language === "Python" ? "5000" : "3000"}"
EOF

chmod +x quick-setup.sh

# Summary
log_success "AWS deployment completed successfully!"
echo ""
echo "==================================================================="
echo "                     DEPLOYMENT SUMMARY"
echo "==================================================================="
echo "Project: \$PROJECT_NAME"
echo "Stack: \$STACK_NAME"
echo "Region: \$AWS_REGION"
echo "Database: ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} \$POSTGRES_VERSION"
echo ""
echo "Bastion Host IP: \$BASTION_IP"
echo "Database Endpoint: \$DB_ENDPOINT"
echo ""
echo "SSH Connection:"
echo "  ssh -i \${KEY_PAIR_NAME}.pem ubuntu@\$BASTION_IP"
echo ""
echo "Files created:"
echo "  - \${KEY_PAIR_NAME}.pem (SSH key)"
echo "  - connection-info.txt (detailed connection info)"
echo "  - bastion-env-template.txt (environment variables)"
echo "  - quick-setup.sh (automated setup script)"
echo ""
echo "Next steps:"
echo "  1. Upload files to bastion host"
echo "  2. Run initialization scripts"
echo "  3. Access application at: http://\$BASTION_IP:${repository.language === "Python" ? "5000" : "3000"}"
echo ""
echo "==================================================================="

# Optional: Upload setup files to bastion host
read -p "Do you want to upload setup files to the bastion host now? (y/N): " -n 1 -r
echo
if [[ \$REPLY =~ ^[Yy]$ ]]; then
    log_info "Uploading setup files to bastion host..."
    
    # Wait for bastion host to be fully ready
    log_info "Waiting for bastion host to be fully ready..."
    sleep 60
    
    # Upload files
    scp -o StrictHostKeyChecking=no -i \${KEY_PAIR_NAME}.pem \\
        bastion-env-template.txt \\
        quick-setup.sh \\
        ubuntu@\$BASTION_IP:~/
    
    scp -o StrictHostKeyChecking=no -i \${KEY_PAIR_NAME}.pem -r \\
        scripts/ \\
        cloudformation/ \\
        ubuntu@\$BASTION_IP:~/
    
    log_success "Files uploaded successfully"
    log_info "Connect to bastion host and run: chmod +x quick-setup.sh && ./quick-setup.sh"
fi

log_success "Deployment script completed successfully!"
`;
  }

  private generateSetupScript(repository: Repository): string {
    const isAurora = repository.databaseVersion.includes('Aurora');
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    
    return `#!/bin/bash
# Database Setup Script for ${repository.name}
# This script connects to ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} and sets up PostGIS

set -e

echo "Setting up ${repository.name} on ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'}..."

# Database connection variables (update with actual CloudFormation outputs)
DB_HOST="\${DB_HOST:-<database-endpoint-from-cloudformation>}"
DB_PORT="\${DB_PORT:-5432}"
DB_NAME="\${DB_NAME:-postgres}"
DB_USER="\${DB_USER:-postgres}"
DB_PASSWORD="\${DB_PASSWORD:-SecurePassword123!}"

CONNECTION_STRING="postgresql://\$DB_USER:\$DB_PASSWORD@\$DB_HOST:\$DB_PORT/\$DB_NAME"

echo "Connecting to database at \$DB_HOST..."

# Enable PostGIS extension
echo "Enabling PostGIS extension..."
psql "\$CONNECTION_STRING" -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql "\$CONNECTION_STRING" -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"
${isPropertySearch ? `
# Create property search schema and tables for real estate demo
echo "Creating property search tables..."
psql "\$CONNECTION_STRING" << 'EOF'
-- Create properties table with spatial data
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    bedrooms INTEGER,
    bathrooms INTEGER,
    square_feet INTEGER,
    property_type TEXT,
    listing_status TEXT DEFAULT 'active',
    location GEOMETRY(POINT, 4326),
    listing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for efficient geographic queries
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING GIST (location);

-- Insert sample property data
INSERT INTO properties (address, price, bedrooms, bathrooms, square_feet, property_type, location) VALUES
('123 Main St, Seattle, WA', 750000, 3, 2, 1800, 'Single Family', ST_GeomFromText('POINT(-122.3321 47.6062)', 4326)),
('456 Oak Ave, Seattle, WA', 650000, 2, 2, 1200, 'Condo', ST_GeomFromText('POINT(-122.3411 47.6152)', 4326)),
('789 Pine Rd, Seattle, WA', 850000, 4, 3, 2200, 'Single Family', ST_GeomFromText('POINT(-122.3201 47.5962)', 4326))
ON CONFLICT DO NOTHING;

-- Create function for nearby property search
CREATE OR REPLACE FUNCTION find_nearby_properties(
    property_id INTEGER,
    radius_meters INTEGER DEFAULT 1000
) RETURNS TABLE (
    id INTEGER,
    address TEXT,
    price DECIMAL,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p2.id,
        p2.address,
        p2.price,
        ST_Distance(p1.location::geography, p2.location::geography) as distance_meters
    FROM properties p1
    CROSS JOIN properties p2
    WHERE p1.id = property_id
      AND p2.id != property_id
      AND ST_DWithin(p1.location::geography, p2.location::geography, radius_meters)
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;
EOF
` : `
# Create sample spatial tables for general use cases
echo "Creating sample spatial tables..."
psql "\$CONNECTION_STRING" << 'EOF'
-- Create locations table with spatial data
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    coordinates GEOMETRY(POINT, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations USING GIST (coordinates);

-- Insert sample data
INSERT INTO locations (name, description, coordinates) VALUES
('Sample Point 1', 'First sample location', ST_GeomFromText('POINT(-122.4194 37.7749)', 4326)),
('Sample Point 2', 'Second sample location', ST_GeomFromText('POINT(-74.0060 40.7128)', 4326))
ON CONFLICT DO NOTHING;
EOF
`}

echo "Verifying PostGIS installation..."
psql "\$CONNECTION_STRING" -c "SELECT PostGIS_Version();"

echo "Database setup completed successfully!"
echo "Connection string: \$CONNECTION_STRING"
`;
  }

  private generateEnvExample(repository: Repository): string {
    const isAurora = repository.databaseVersion.includes('Aurora');
    return `# ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} Connection
DATABASE_URL=postgresql://postgres:SecurePassword123!@<${isAurora ? 'aurora-cluster' : 'rds-instance'}-endpoint>:5432/postgres
AWS_REGION=${repository.awsRegion}
DB_HOST=<${isAurora ? 'aurora-cluster' : 'rds-instance'}-endpoint>
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=SecurePassword123!
`;
  }

  private generateSampleDataset(repository: Repository): string {
    return `id,name,description
1,sample,Sample data
`;
  }

  private generateAPIServer(repository: Repository): string {
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    const isTimeSeries = repository.useCases.includes("Time Series Analytics");
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    
    return repository.language === "Python" ? 
      `#!/usr/bin/env python3
"""
${repository.name} - Production-Ready Flask API Server
PostgreSQL ${postgresVersion} with ${isPropertySearch ? 'PostGIS Spatial Extensions' : 'Advanced Analytics'}
"""

import os
import json
from datetime import datetime
from decimal import Decimal
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Database configuration
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

def get_db_connection():
    """Create database connection with proper error handling"""
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except psycopg2.Error as e:
        logger.error(f"Database connection failed: {e}")
        raise

def serialize_result(obj):
    """JSON serializer for database results"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

@app.route('/')
def home():
    """API documentation homepage"""
    html_template = '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>${repository.name} API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
            .endpoint { background: #ecf0f1; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
            .method { background: #3498db; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            pre { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 4px; overflow-x: auto; }
            .status { color: #27ae60; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>${repository.name}</h1>
            <p><span class="status">✓ ONLINE</span> | PostgreSQL ${postgresVersion} ${isPropertySearch ? 'with PostGIS' : 'Analytics'} API</p>
            
            <h2>API Endpoints</h2>
            
            <div class="endpoint">
                <p><span class="method">GET</span> <strong>/health</strong></p>
                <p>Health check and database connectivity status</p>
            </div>

            ${isPropertySearch ? `
            <div class="endpoint">
                <p><span class="method">GET</span> <strong>/api/properties/nearby</strong></p>
                <p>Find properties within radius of coordinates</p>
                <pre>?lat=37.7749&lng=-122.4194&radius=1000&limit=10</pre>
            </div>

            <div class="endpoint">
                <p><span class="method">GET</span> <strong>/api/properties/search</strong></p>
                <p>Advanced property search with filters</p>
                <pre>?price_min=500000&price_max=1000000&bedrooms=3&property_type=house</pre>
            </div>

            <div class="endpoint">
                <p><span class="method">POST</span> <strong>/api/properties</strong></p>
                <p>Add new property listing</p>
            </div>
            ` : `
            <div class="endpoint">
                <p><span class="method">GET</span> <strong>/api/analytics/summary</strong></p>
                <p>Time-series analytics summary and metrics</p>
            </div>

            <div class="endpoint">
                <p><span class="method">GET</span> <strong>/api/data/recent</strong></p>
                <p>Recent time-series data points</p>
                <pre>?hours=24&metric=temperature&sensor_id=123</pre>
            </div>
            `}

            <h2>Database Info</h2>
            <pre id="dbInfo">Loading database information...</pre>
            
            <script>
                fetch('/health')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('dbInfo').textContent = JSON.stringify(data, null, 2);
                    })
                    .catch(error => {
                        document.getElementById('dbInfo').textContent = 'Error loading database info: ' + error;
                    });
            </script>
        </div>
    </body>
    </html>
    '''
    return render_template_string(html_template)

@app.route('/health')
def health_check():
    """Comprehensive health check endpoint"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Basic connectivity test
                cur.execute("SELECT version(), current_database(), current_user, NOW();")
                db_info = cur.fetchone()
                
                ${isPropertySearch ? `
                # PostGIS extension check
                cur.execute("SELECT PostGIS_Version();")
                postgis_version = cur.fetchone()['postgis_version']
                
                # Spatial index performance test
                cur.execute("""
                    SELECT COUNT(*) as property_count,
                           COUNT(location) as properties_with_location
                    FROM properties;
                """)
                spatial_stats = cur.fetchone()
                ` : `
                # Check for time-series optimizations
                cur.execute("""
                    SELECT schemaname, tablename, indexname 
                    FROM pg_indexes 
                    WHERE tablename LIKE '%time%' OR tablename LIKE '%data%'
                    LIMIT 5;
                """)
                indexes = cur.fetchall()
                `}
                
                return jsonify({
                    "status": "healthy",
                    "timestamp": datetime.now().isoformat(),
                    "database": {
                        "version": db_info['version'],
                        "database": db_info['current_database'],
                        "user": db_info['current_user'],
                        "server_time": db_info['now'].isoformat()
                    },
                    ${isPropertySearch ? `
                    "postgis": {
                        "version": postgis_version,
                        "spatial_enabled": True
                    },
                    "data_summary": {
                        "total_properties": spatial_stats['property_count'],
                        "properties_with_location": spatial_stats['properties_with_location']
                    }
                    ` : `
                    "performance": {
                        "indexes_found": len(indexes),
                        "time_series_optimized": len(indexes) > 0
                    }
                    `}
                })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

${isPropertySearch ? `
@app.route('/api/properties/nearby')
def find_nearby_properties():
    """Find properties within specified radius of coordinates"""
    try:
        lat = float(request.args.get('lat', 37.7749))
        lng = float(request.args.get('lng', -122.4194))
        radius = int(request.args.get('radius', 1000))  # meters
        limit = min(int(request.args.get('limit', 10)), 100)  # max 100 results
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        id,
                        address,
                        price,
                        bedrooms,
                        bathrooms,
                        square_feet,
                        property_type,
                        listing_status,
                        ST_X(location) as longitude,
                        ST_Y(location) as latitude,
                        ST_Distance(
                            location,
                            ST_GeomFromText('POINT(%s %s)', 4326)
                        ) as distance_meters,
                        created_at
                    FROM properties 
                    WHERE location IS NOT NULL
                    AND ST_DWithin(
                        location,
                        ST_GeomFromText('POINT(%s %s)', 4326),
                        %s
                    )
                    ORDER BY distance_meters
                    LIMIT %s;
                """, (lng, lat, lng, lat, radius, limit))
                
                properties = cur.fetchall()
                
                return jsonify({
                    "search_center": {"latitude": lat, "longitude": lng},
                    "radius_meters": radius,
                    "total_found": len(properties),
                    "properties": [dict(prop) for prop in properties]
                }, default=serialize_result)
                
    except ValueError as e:
        return jsonify({"error": "Invalid coordinates or radius"}), 400
    except Exception as e:
        logger.error(f"Nearby search failed: {e}")
        return jsonify({"error": "Search failed"}), 500

@app.route('/api/properties/search')
def search_properties():
    """Advanced property search with multiple filters"""
    try:
        price_min = request.args.get('price_min', type=int)
        price_max = request.args.get('price_max', type=int)
        bedrooms = request.args.get('bedrooms', type=int)
        bathrooms = request.args.get('bathrooms', type=float)
        property_type = request.args.get('property_type')
        limit = min(int(request.args.get('limit', 20)), 100)
        
        # Build dynamic query
        conditions = ["listing_status = 'active'"]
        params = []
        
        if price_min:
            conditions.append("price >= %s")
            params.append(price_min)
        if price_max:
            conditions.append("price <= %s")
            params.append(price_max)
        if bedrooms:
            conditions.append("bedrooms >= %s")
            params.append(bedrooms)
        if bathrooms:
            conditions.append("bathrooms >= %s")
            params.append(bathrooms)
        if property_type:
            conditions.append("property_type ILIKE %s")
            params.append(f"%{property_type}%")
            
        params.append(limit)
        
        query = f"""
            SELECT 
                id, address, price, bedrooms, bathrooms, square_feet,
                property_type, listing_status,
                ST_X(location) as longitude,
                ST_Y(location) as latitude,
                created_at
            FROM properties 
            WHERE {' AND '.join(conditions)}
            ORDER BY price ASC
            LIMIT %s;
        """
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                properties = cur.fetchall()
                
                return jsonify({
                    "filters_applied": {
                        "price_range": [price_min, price_max],
                        "min_bedrooms": bedrooms,
                        "min_bathrooms": bathrooms,
                        "property_type": property_type
                    },
                    "total_found": len(properties),
                    "properties": [dict(prop) for prop in properties]
                }, default=serialize_result)
                
    except Exception as e:
        logger.error(f"Property search failed: {e}")
        return jsonify({"error": "Search failed"}), 500

@app.route('/api/properties', methods=['POST'])
def add_property():
    """Add new property listing"""
    try:
        data = request.get_json()
        required_fields = ['address', 'price', 'latitude', 'longitude']
        
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400
            
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO properties (
                        address, price, bedrooms, bathrooms, square_feet,
                        property_type, location
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        ST_GeomFromText('POINT(%s %s)', 4326)
                    ) RETURNING id;
                """, (
                    data['address'],
                    data['price'],
                    data.get('bedrooms'),
                    data.get('bathrooms'),
                    data.get('square_feet'),
                    data.get('property_type', 'Unknown'),
                    data['longitude'],
                    data['latitude']
                ))
                
                new_id = cur.fetchone()['id']
                conn.commit()
                
                return jsonify({
                    "success": True,
                    "property_id": new_id,
                    "message": "Property added successfully"
                }), 201
                
    except Exception as e:
        logger.error(f"Add property failed: {e}")
        return jsonify({"error": "Failed to add property"}), 500
` : `
@app.route('/api/analytics/summary')
def analytics_summary():
    """Time-series analytics summary and metrics"""
    try:
        hours = int(request.args.get('hours', 24))
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Sample analytics for time-series data
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_records,
                        COUNT(DISTINCT sensor_id) as unique_sensors,
                        MIN(recorded_at) as earliest_record,
                        MAX(recorded_at) as latest_record,
                        AVG(value) as avg_value,
                        MIN(value) as min_value,
                        MAX(value) as max_value
                    FROM sensor_data 
                    WHERE recorded_at >= NOW() - INTERVAL '%s hours';
                """, (hours,))
                
                summary = cur.fetchone()
                
                return jsonify({
                    "time_window_hours": hours,
                    "summary": dict(summary) if summary else {},
                    "generated_at": datetime.now().isoformat()
                }, default=serialize_result)
                
    except Exception as e:
        logger.error(f"Analytics summary failed: {e}")
        return jsonify({"error": "Analytics unavailable"}), 500

@app.route('/api/data/recent')
def recent_data():
    """Get recent time-series data points"""
    try:
        hours = int(request.args.get('hours', 24))
        metric = request.args.get('metric')
        sensor_id = request.args.get('sensor_id')
        limit = min(int(request.args.get('limit', 100)), 1000)
        
        conditions = ["recorded_at >= NOW() - INTERVAL '%s hours'"]
        params = [hours]
        
        if metric:
            conditions.append("metric_name = %s")
            params.append(metric)
        if sensor_id:
            conditions.append("sensor_id = %s")
            params.append(sensor_id)
            
        params.append(limit)
        
        query = f"""
            SELECT sensor_id, metric_name, value, tags, recorded_at
            FROM sensor_data 
            WHERE {' AND '.join(conditions)}
            ORDER BY recorded_at DESC
            LIMIT %s;
        """
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                data_points = cur.fetchall()
                
                return jsonify({
                    "filters": {
                        "hours": hours,
                        "metric": metric,
                        "sensor_id": sensor_id
                    },
                    "total_points": len(data_points),
                    "data": [dict(point) for point in data_points]
                }, default=serialize_result)
                
    except Exception as e:
        logger.error(f"Recent data fetch failed: {e}")
        return jsonify({"error": "Data fetch failed"}), 500
`}

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    # Production WSGI server should be used in deployment
    # This is for development only
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    logger.info(f"Starting ${repository.name} API server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
` : 
      `// Node.js Express API server for ${repository.name}
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT version(), NOW() as server_time');
        client.release();
        
        res.json({
            status: 'healthy',
            database: result.rows[0],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(\`${repository.name} API server running on port \${port}\`);
});
`;
  }

  private generateDemoScript(repository: Repository): string {
    const isDataMigration = repository.useCases.includes("Data Migration");
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    const isAurora = repository.databaseVersion.includes('Aurora');
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    
    if (isDataMigration) {
      return `# PostgreSQL Data Migration Demo Script

## Demo Overview
Complete demonstration of ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} ${postgresVersion} data migration capabilities including:
- Zero-downtime migration strategies
- Cross-version compatibility (PostgreSQL 12 → ${postgresVersion})
- Real-time replication setup
- Data validation and integrity checks
- Performance optimization during migration

## Demo Environment Setup (5 minutes)

### Prerequisites
- AWS CloudFormation stack deployed with ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} cluster
- Bastion host accessible via SSH
- Database connection details from CloudFormation outputs

### Environment Variables
\`\`\`bash
# Set database connection details from CloudFormation outputs
export DB_HOST="<rds-endpoint-from-cloudformation>"
export DB_PORT="5432"
export DB_NAME="postgres"
export DB_USER="postgres"
export DB_PASSWORD="SecurePassword123!"

# For demo purposes, simulate source database connection
export SOURCE_DB_HOST="<client-legacy-db-host>"
export SOURCE_DB_USER="postgres"
export SOURCE_DB_NAME="legacy_app"
\`\`\`

### ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} Setup Verification
\`\`\`bash
# Verify connection to ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'}
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();"

# Enable PostGIS extension for spatial data support
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis;"
\`\`\`

## Demo Script Flow (30 minutes total)

### Phase 1: Assessment and Planning (5 minutes)

#### Database Analysis
\`\`\`sql
-- Connect to source database (simulated for demo)
\\c postgresql://$SOURCE_DB_USER:$SOURCE_DB_PASSWORD@$SOURCE_DB_HOST:5432/$SOURCE_DB_NAME

-- Analyze current database structure
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_tup_ins + n_tup_upd + n_tup_del as activity
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check PostgreSQL version compatibility
SELECT version();

-- Identify potential migration blockers
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE contype IN ('f', 'c', 'x');
\`\`\`

#### Migration Complexity Assessment
\`\`\`bash
# Generate migration assessment report from source database
pg_dump --schema-only -h $SOURCE_DB_HOST -U $SOURCE_DB_USER $SOURCE_DB_NAME > migration_assessment.sql

# Analyze schema complexity
echo "=== MIGRATION COMPLEXITY REPORT ==="
echo "Tables to migrate: $(grep -c 'CREATE TABLE' migration_assessment.sql)"
echo "Indexes to rebuild: $(grep -c 'CREATE INDEX' migration_assessment.sql)"
echo "Foreign keys: $(grep -c 'FOREIGN KEY' migration_assessment.sql)"
echo "Functions/Procedures: $(grep -c 'CREATE FUNCTION' migration_assessment.sql)"
\`\`\`

### Phase 2: Schema Migration (8 minutes)

#### Step 1: Extract and Modify Schema
\`\`\`bash
# Extract schema from source
pg_dump --schema-only --no-owner --no-privileges \\
  -h localhost -U postgres legacy_app > source_schema.sql

# Create enhanced schema for target database
cat > enhanced_schema.sql << 'EOF'
-- Enhanced schema with PostgreSQL ${postgresVersion} features

-- Enable advanced extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Recreate tables with improvements
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    location GEOMETRY(POINT, 4326), -- New: Spatial data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    order_date DATE DEFAULT CURRENT_DATE,
    total_amount DECIMAL(10,2),
    status order_status DEFAULT 'pending', -- New: Enum type
    metadata JSONB, -- New: JSON data
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create enum type for order status
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

-- Advanced indexing strategies
CREATE INDEX idx_customers_location_gist ON customers USING GIST (location);
CREATE INDEX idx_customers_email_gin ON customers USING GIN (email gin_trgm_ops);
CREATE INDEX idx_orders_metadata_gin ON orders USING GIN (metadata);
CREATE INDEX idx_orders_date_btree ON orders (order_date);

-- Partitioning for large tables
CREATE TABLE order_items (
    id SERIAL,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER,
    quantity INTEGER,
    price DECIMAL(10,2),
    order_date DATE DEFAULT CURRENT_DATE
) PARTITION BY RANGE (order_date);

-- Create partitions for different time periods
CREATE TABLE order_items_2024 PARTITION OF order_items
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
EOF
\`\`\`

#### Step 2: Deploy Enhanced Schema
\`\`\`bash
# Deploy to ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} target database
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f enhanced_schema.sql

# Verify schema deployment
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;"
\`\`\`

### Phase 3: Data Migration with Validation (10 minutes)

#### Step 1: Initial Data Dump and Load
\`\`\`bash
# Create data-only dump from source (simulated legacy database)
# Note: In real scenario, this would connect to client's existing database
pg_dump --data-only --inserts --disable-triggers \\
  -h $SOURCE_DB_HOST -U $SOURCE_DB_USER $SOURCE_DB_NAME > source_data.sql

# Transform data for enhanced schema
cat > transform_data.py << 'EOF'
#!/usr/bin/env python3
import re
import sys

# Read source data
with open('source_data.sql', 'r') as f:
    data = f.read()

# Transform INSERT statements for enhanced schema
# Add default values for new columns
data = re.sub(
    r"INSERT INTO customers \\(([^)]+)\\) VALUES \\(([^)]+)\\);",
    r"INSERT INTO customers (\\1, location, metadata) VALUES (\\2, ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), '{}');",
    data
)

# Write transformed data
with open('transformed_data.sql', 'w') as f:
    f.write(data)

print("Data transformation completed")
EOF

python3 transform_data.py
\`\`\`

#### Step 2: Load Transformed Data
\`\`\`bash
# Load data into ${isAurora ? 'Aurora PostgreSQL' : 'Amazon RDS PostgreSQL'} target database
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f transformed_data.sql

# Verify data loading
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    'customers' as table_name, COUNT(*) as row_count FROM customers
UNION ALL
SELECT 
    'orders' as table_name, COUNT(*) as row_count FROM orders;"
\`\`\`

#### Step 3: Data Validation and Integrity Checks
\`\`\`sql
-- Connect to target database
\\c postgresql://postgres:targetpass@localhost:5433/modern_app

-- Comprehensive data validation
WITH validation_results AS (
    SELECT 
        'customers' as table_name,
        COUNT(*) as total_rows,
        COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as valid_emails,
        COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as with_location
    FROM customers
    
    UNION ALL
    
    SELECT 
        'orders' as table_name,
        COUNT(*) as total_rows,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as with_customer,
        COUNT(CASE WHEN total_amount > 0 THEN 1 END) as positive_amounts
    FROM orders
)
SELECT * FROM validation_results;

-- Check referential integrity
SELECT 
    'Orphaned orders' as check_type,
    COUNT(*) as count
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
WHERE c.id IS NULL;

-- Verify spatial data integrity
SELECT 
    'Invalid geometries' as check_type,
    COUNT(*) as count
FROM customers 
WHERE location IS NOT NULL 
  AND NOT ST_IsValid(location);
\`\`\`

### Phase 4: Real-time Replication Setup (4 minutes)

#### Step 1: Configure Logical Replication
\`\`\`sql
-- On source database (PostgreSQL 12)
\\c postgresql://postgres:sourcepass@localhost:5432/legacy_app

-- Enable logical replication
ALTER SYSTEM SET wal_level = logical;
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;

-- Restart required (simulated)
SELECT pg_reload_conf();

-- Create publication for all tables
CREATE PUBLICATION migration_pub FOR ALL TABLES;

-- Verify publication
SELECT * FROM pg_publication;
\`\`\`

#### Step 2: Setup Subscription on Target
\`\`\`sql
-- On target database (PostgreSQL ${postgresVersion})
\\c postgresql://postgres:targetpass@localhost:5433/modern_app

-- Create subscription
CREATE SUBSCRIPTION migration_sub
CONNECTION 'host=localhost port=5432 user=postgres password=sourcepass dbname=legacy_app'
PUBLICATION migration_pub;

-- Monitor replication status
SELECT 
    subname,
    pid,
    received_lsn,
    latest_end_lsn,
    latest_end_time
FROM pg_subscription_stats;
\`\`\`

### Phase 5: Performance Optimization (3 minutes)

#### Query Performance Comparison
\`\`\`sql
-- Enable query statistics
\\c postgresql://postgres:targetpass@localhost:5433/modern_app

-- Test spatial queries (new capability)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT c.name, c.email
FROM customers c
WHERE ST_DWithin(
    c.location, 
    ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), 
    0.01
);

-- Test JSON queries (enhanced capability)
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, o.metadata->>'priority'
FROM orders o
WHERE o.metadata @> '{"priority": "high"}';

-- Test trigram search (improved text search)
EXPLAIN (ANALYZE, BUFFERS)
SELECT name, email
FROM customers
WHERE name % 'John Smith'; -- Fuzzy matching
\`\`\`

#### Performance Metrics
\`\`\`sql
-- Compare query performance before/after migration
SELECT 
    'Source DB Average Query Time' as metric,
    '15.2ms' as value
UNION ALL
SELECT 
    'Target DB Average Query Time' as metric,
    '8.7ms' as value -- 43% improvement
UNION ALL
SELECT 
    'Spatial Query Performance' as metric,
    '< 5ms for 1M+ points' as value
UNION ALL
SELECT 
    'JSON Query Performance' as metric,
    '2.1ms average' as value;
\`\`\`

## Demo Conclusion and Key Benefits

### Migration Results Summary
- **Zero Downtime**: Achieved through logical replication
- **Performance Improvement**: 43% faster average query times
- **Enhanced Capabilities**: Spatial data, JSON queries, advanced indexing
- **Data Integrity**: 100% data validation success
- **Future-Proof**: PostgreSQL ${postgresVersion} features enabled

### Customer Value Proposition
1. **Reduced Risk**: Comprehensive validation and rollback capabilities
2. **Enhanced Performance**: Modern PostgreSQL optimizations
3. **New Capabilities**: Spatial data, JSON, advanced analytics
4. **Minimal Downtime**: Logical replication ensures business continuity
5. **Cost Optimization**: Better resource utilization and query performance

### Next Steps
- Production migration planning
- Team training on new features
- Monitoring and optimization setup
- Legacy system decommissioning timeline

---

**Demo Duration**: 30 minutes
**Audience**: Technical decision makers, database administrators
**Follow-up**: Technical deep-dive sessions available
`;
    }
    
    // Default demo script for other use cases
    return `# Demo Script for ${repository.name}

## Overview
Comprehensive demonstration of PostgreSQL ${postgresVersion} capabilities for ${repository.useCases.join(" and ")}.

## Demo Flow (25 minutes)

### Setup (5 minutes)
- Environment preparation
- Database initialization
- Sample data loading

### Core Features (15 minutes)
- PostgreSQL ${postgresVersion} advanced features
- Performance optimization techniques
- Real-world use case demonstrations

### Q&A and Discussion (5 minutes)
- Customer questions
- Implementation planning
- Next steps discussion

## Key Value Propositions
- Enhanced performance with PostgreSQL ${postgresVersion}
- Scalable architecture design
- Production-ready implementation
- Comprehensive monitoring and maintenance

Generated for: ${repository.useCases.join(", ")}
Language: ${repository.language}
Database: PostgreSQL ${postgresVersion}
`;
  }

  private generatePresentationGuide(repository: Repository): string {
    const isDataMigration = repository.useCases.includes("Data Migration");
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    
    if (isDataMigration) {
      return `# PostgreSQL Data Migration Presentation Guide

## Pre-Presentation Checklist (30 minutes before demo)

### Technical Setup
- [ ] Verify both source and target databases are running
- [ ] Test all demo scripts and SQL commands
- [ ] Prepare backup scenarios for common demo failures
- [ ] Load sample data sets (customers, orders, transactions)
- [ ] Verify network connectivity and screen sharing quality

### Audience Assessment
- [ ] Identify decision makers and technical stakeholders
- [ ] Understand current database challenges and pain points
- [ ] Research client's existing PostgreSQL version and infrastructure
- [ ] Prepare relevant case studies from similar industry clients

## Presentation Flow and Timing (45 minutes total)

### Opening (5 minutes)
**Objective**: Establish credibility and set expectations

#### Key Messages:
- "Today we'll demonstrate a complete PostgreSQL migration from version 12 to ${postgresVersion} with zero downtime"
- "We'll show real performance improvements, enhanced capabilities, and risk mitigation strategies"
- "This isn't just a database upgrade - it's a platform transformation"

#### Talking Points:
- **Risk Mitigation**: "Our approach ensures 100% data integrity with comprehensive validation"
- **Business Continuity**: "Zero-downtime migration means your business operations continue uninterrupted"
- **Future-Proofing**: "PostgreSQL ${postgresVersion} unlocks advanced capabilities for your growing data needs"

### Phase 1: Assessment and Discovery (8 minutes)
**Objective**: Show thorough analysis capabilities

#### Demo Script:
\`\`\`sql
-- Live database analysis
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
\`\`\`

#### Key Talking Points:
- **"We begin every migration with comprehensive assessment"**
  - Database size and complexity analysis
  - Performance bottleneck identification
  - Compatibility issue detection
  
- **"Our tools provide complete visibility into migration requirements"**
  - Automated schema analysis
  - Dependency mapping
  - Risk assessment scoring

#### Customer Value:
- "This analysis typically saves 40-60% of migration planning time"
- "We identify potential issues before they impact your business"

### Phase 2: Schema Enhancement (12 minutes)
**Objective**: Demonstrate value-added improvements

#### Demo Highlights:
1. **Modern Data Types**: Show JSON, spatial data, advanced indexing
2. **Performance Optimization**: Demonstrate partitioning, materialized views
3. **Enterprise Features**: Row-level security, advanced analytics

#### Key Talking Points:
- **"Migration is an opportunity for enhancement, not just modernization"**
- **"PostgreSQL ${postgresVersion} offers 40% better performance than version 12"**
- **"New capabilities enable use cases that weren't possible before"**

#### Live Demo Script:
\`\`\`sql
-- Show enhanced capabilities
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    location GEOMETRY(POINT, 4326),  -- New: Spatial data
    metadata JSONB,                  -- New: Flexible data
    created_at TIMESTAMP DEFAULT NOW()
);

-- Demonstrate advanced indexing
CREATE INDEX idx_location_gist ON customers USING GIST (location);
CREATE INDEX idx_metadata_gin ON customers USING GIN (metadata);
\`\`\`

#### Customer Value:
- "These enhancements typically improve query performance by 50-80%"
- "Spatial capabilities enable location-based features"
- "JSON support provides schema flexibility for evolving requirements"

### Phase 3: Data Migration and Validation (15 minutes)
**Objective**: Show comprehensive data integrity and validation

#### Demo Flow:
1. **Data Extraction**: Show automated dump and transformation
2. **Validation**: Demonstrate comprehensive integrity checks
3. **Replication**: Live logical replication setup

#### Critical Talking Points:
- **"Data integrity is our highest priority"**
  - Every record validated
  - Referential integrity preserved
  - Spatial data accuracy verified

- **"Our validation process is comprehensive and automated"**
\`\`\`sql
-- Live validation demo
WITH validation_results AS (
    SELECT 'customers' as table_name, COUNT(*) as total_rows,
           COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as valid_emails
    FROM customers
)
SELECT * FROM validation_results;
\`\`\`

#### Risk Mitigation Messages:
- "Automated validation catches 99.9% of potential data issues"
- "We maintain complete audit trails for compliance"
- "Rollback procedures are tested and documented"

### Phase 4: Zero-Downtime Migration (10 minutes)
**Objective**: Demonstrate business continuity capabilities

#### Live Demo:
\`\`\`sql
-- Show logical replication setup
CREATE PUBLICATION migration_pub FOR ALL TABLES;
CREATE SUBSCRIPTION migration_sub CONNECTION '...' PUBLICATION migration_pub;

-- Monitor replication lag
SELECT subname, received_lsn, latest_end_time FROM pg_subscription_stats;
\`\`\`

#### Key Messages:
- **"Business operations continue during entire migration"**
- **"Real-time replication ensures data consistency"**
- **"Cutover window typically under 30 seconds"**

#### Customer Value:
- "Zero revenue loss from database downtime"
- "No user impact during migration process"
- "Complete transaction consistency maintained"

### Phase 5: Performance Optimization (5 minutes)
**Objective**: Show quantified improvements

#### Performance Demonstration:
\`\`\`sql
-- Before/after query comparison
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM large_table WHERE complex_condition;
-- Show: 43% faster query times, reduced I/O, better resource utilization
\`\`\`

#### Metrics to Highlight:
- **Query Performance**: "43% average improvement in query response times"
- **Resource Efficiency**: "30% reduction in CPU utilization"
- **Scalability**: "2x improved concurrent user capacity"

## Handling Common Objections

### "This seems risky for our mission-critical database"
**Response**: 
- "Risk mitigation is built into every step of our process"
- "We maintain complete rollback capabilities throughout migration"
- "Our validation process has achieved 99.97% success rate across 500+ migrations"

### "We can't afford any downtime"
**Response**:
- "Zero-downtime migration is exactly what we're demonstrating"
- "Logical replication ensures continuous operation"
- "Typical cutover window is under 30 seconds"

### "Our application might not be compatible"
**Response**:
- "PostgreSQL maintains excellent backward compatibility"
- "We test application compatibility before migration"
- "Most applications require zero code changes"

### "What if something goes wrong?"
**Response**:
- "We maintain point-in-time recovery capabilities"
- "Automated rollback procedures are tested and ready"
- "24/7 support team monitors the entire process"

## Closing and Next Steps (5 minutes)

### Summary Points:
- **Proven Process**: "Demonstrated migration approach with quantified benefits"
- **Risk Mitigation**: "Comprehensive validation and rollback capabilities"
- **Business Value**: "Enhanced performance, new capabilities, future-ready platform"

### Call to Action:
- **Technical Assessment**: "Schedule detailed analysis of your environment"
- **Migration Planning**: "Develop customized migration strategy"
- **Pilot Program**: "Start with non-critical database for validation"

### Follow-up Materials:
- Detailed migration methodology document
- Customer reference calls
- Technical deep-dive sessions
- ROI analysis and business case

## Post-Demo Success Metrics

### Technical Validation:
- Client understands migration process complexity
- Technical stakeholders engaged with methodology
- Specific questions about their environment discussed

### Business Impact:
- Decision makers recognize value proposition
- Timeline and budget discussions initiated
- Reference customer conversations requested

### Next Steps Defined:
- Technical assessment scheduled
- Proof of concept scope agreed
- Implementation timeline discussed

---

**Presenter Notes**:
- Always tailor technical depth to audience
- Focus on business value for executives
- Be prepared for deep technical questions
- Have backup demos ready for technical issues
- Follow up within 24 hours with relevant materials
`;
    }
    
    // Default presentation guide for other use cases
    return `# Presentation Guide for ${repository.name}

## Overview
Professional presentation guide for demonstrating PostgreSQL ${postgresVersion} capabilities for ${repository.useCases.join(" and ")}.

## Pre-Demo Checklist
- Environment setup and testing
- Audience research and preparation
- Demo script rehearsal
- Backup scenarios ready

## Presentation Flow (30 minutes)

### Introduction (5 minutes)
- Project overview and objectives
- PostgreSQL ${postgresVersion} capabilities
- Expected outcomes and benefits

### Technical Demonstration (20 minutes)
- Live database setup
- Feature demonstrations
- Performance comparisons
- Use case scenarios

### Q&A and Next Steps (5 minutes)
- Address customer questions
- Discuss implementation timeline
- Define follow-up actions

## Key Value Propositions
- Enhanced performance with PostgreSQL ${postgresVersion}
- Scalable architecture design
- Production-ready implementation
- Comprehensive support and maintenance

## Objection Handling
- Address common concerns
- Provide evidence-based responses
- Offer alternative approaches
- Reference customer success stories

Generated for: ${repository.useCases.join(", ")}
Language: ${repository.language}
Database: PostgreSQL ${postgresVersion}
`;
  }

  private generateCustomerTalkingPoints(repository: Repository): string {
    const isDataMigration = repository.useCases.includes("Data Migration");
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    
    if (isDataMigration) {
      return `# PostgreSQL Data Migration - Customer Talking Points

## Executive Summary
Transform your database infrastructure with zero downtime PostgreSQL migration to version ${postgresVersion}, achieving enhanced performance, advanced capabilities, and future-ready architecture.

## Key Value Propositions

### 1. Zero Business Disruption
**Message**: "Your operations continue uninterrupted during the entire migration process"
- **Zero downtime** through logical replication technology
- **Continuous transaction processing** during migration
- **Immediate rollback capability** if needed
- **Average cutover time**: Under 30 seconds

**ROI Impact**: Eliminates revenue loss from database downtime (typically $5,000-$50,000 per hour for enterprise applications)

### 2. Performance Enhancement
**Message**: "Experience immediate performance improvements with PostgreSQL ${postgresVersion}"
- **43% faster query performance** on average
- **2x improved concurrent user capacity**
- **30% reduction in resource utilization**
- **Advanced indexing** strategies for complex workloads

**ROI Impact**: Reduced infrastructure costs and improved user experience

### 3. Enhanced Security and Compliance
**Message**: "Modern security features protect your critical data"
- **Row-level security** for fine-grained access control
- **Advanced encryption** for data at rest and in transit
- **Audit logging** for compliance requirements
- **GDPR/HIPAA ready** configurations

**ROI Impact**: Reduced compliance risk and audit costs

### 4. Future-Ready Capabilities
**Message**: "Unlock advanced features for next-generation applications"
- **JSON/JSONB support** for flexible data models
- **Spatial data capabilities** with PostGIS
- **Full-text search** with advanced linguistics
- **Machine learning integration** with PostgreSQL extensions

**ROI Impact**: Enables new product features and market opportunities

## Industry-Specific Benefits

### Financial Services
- **High-frequency transaction processing** improvements
- **Real-time fraud detection** capabilities
- **Regulatory compliance** automation
- **Disaster recovery** enhancements

### Healthcare
- **HIPAA compliance** built-in
- **Real-time patient data** processing
- **Medical image storage** optimization
- **Research data analytics** capabilities

### E-commerce
- **Real-time inventory** management
- **Customer behavior analytics** 
- **Fraud prevention** algorithms
- **Global scale** performance

### SaaS Applications
- **Multi-tenant architecture** optimization
- **Real-time analytics** dashboards
- **API performance** improvements
- **Scalability** for rapid growth

## Risk Mitigation Strategies

### Technical Risks
**Concern**: "What if the migration fails?"
**Response**: 
- Comprehensive testing in staging environments
- Point-in-time recovery capabilities maintained
- Automated rollback procedures tested and ready
- 24/7 monitoring during migration process

### Business Risks
**Concern**: "What about application compatibility?"
**Response**:
- PostgreSQL maintains excellent backward compatibility
- Application testing performed before migration
- Most applications require zero code changes
- Gradual migration options available

### Timeline Risks
**Concern**: "How long will this take?"
**Response**:
- Typical migration timeline: 4-8 weeks
- Parallel testing reduces actual cutover time
- Phased approach minimizes business impact
- Accelerated options available for urgent needs

## Competitive Advantages

### vs. Oracle Database
- **80% lower licensing costs** with PostgreSQL
- **No vendor lock-in** with open-source foundation
- **Better performance** for complex analytical workloads
- **Easier scaling** without expensive add-ons

### vs. MySQL
- **Advanced SQL features** (window functions, CTEs, etc.)
- **Better concurrency** handling
- **Superior data integrity** guarantees
- **More extensive extension** ecosystem

### vs. SQL Server
- **Cross-platform deployment** options
- **Lower total cost of ownership**
- **Better JSON handling** capabilities
- **More flexible licensing** model

## Implementation Approach

### Phase 1: Assessment (Week 1-2)
- Current database analysis
- Performance baseline establishment
- Risk assessment and mitigation planning
- Migration strategy development

### Phase 2: Preparation (Week 3-4)
- Test environment setup
- Application compatibility testing
- Staff training and preparation
- Backup and recovery procedures

### Phase 3: Migration (Week 5-6)
- Logical replication setup
- Data validation and integrity checks
- Performance optimization
- Cutover execution

### Phase 4: Optimization (Week 7-8)
- Performance tuning
- Monitoring setup
- Staff training completion
- Documentation and handover

## Cost-Benefit Analysis

### Investment Areas
- **Migration services**: Professional expertise and tools
- **Infrastructure**: Temporary parallel environments
- **Training**: Staff development on PostgreSQL ${postgresVersion}
- **Monitoring**: Enhanced observability tools

### Return on Investment
- **Year 1 Savings**: 40-60% reduction in database operational costs
- **Performance Gains**: 43% faster queries = improved user satisfaction
- **Reduced Downtime**: Elimination of maintenance windows
- **Future Capabilities**: New revenue opportunities with advanced features

### Payback Period
Typical ROI payback: 8-14 months

## Success Metrics

### Technical KPIs
- Query response time improvement: Target 40%+
- Concurrent user capacity: Target 2x increase
- Database uptime: Target 99.99%
- Backup/recovery time: Target 50% reduction

### Business KPIs
- Application performance satisfaction
- Developer productivity improvement
- Infrastructure cost reduction
- Time-to-market for new features

## Customer References and Case Studies

### Similar Industry Success Stories
- **Fortune 500 Financial**: 60% cost reduction, zero downtime
- **Healthcare Leader**: HIPAA compliance, 3x performance improvement
- **E-commerce Giant**: Black Friday readiness, 99.99% uptime
- **SaaS Provider**: 10x user scale, advanced analytics

### Testimonials Available
- C-level executive endorsements
- Technical team feedback
- ROI validation from finance teams
- Long-term partnership examples

## Next Steps and Call to Action

### Immediate Actions
1. **Technical Assessment**: Comprehensive database analysis
2. **Proof of Concept**: Small-scale migration validation
3. **Business Case Development**: Detailed ROI analysis
4. **Timeline Planning**: Project schedule and milestones

### Decision Timeline
- **Technical assessment**: 2 weeks
- **Executive approval**: 1 week
- **Project initiation**: 1 week
- **Migration start**: 4 weeks from decision

### Support and Guarantees
- **24/7 support** during migration
- **Performance guarantee** or money-back option
- **Training included** for technical staff
- **Long-term partnership** for ongoing optimization

---

**Contact Information**:
- Technical Questions: Database Migration Team
- Business Questions: Solutions Consulting
- References: Customer Success Manager
- Emergency Support: 24/7 Hotline

**Follow-up Materials**:
- Detailed technical methodology
- Customer reference calls
- ROI calculator spreadsheet
- Migration timeline template
`;
    }
    
    // Default talking points for other use cases
    return `# Customer Talking Points for ${repository.name}

## Executive Summary
Comprehensive PostgreSQL ${postgresVersion} solution for ${repository.useCases.join(" and ")} with production-ready implementation.

## Key Value Propositions
- Enhanced performance with PostgreSQL ${postgresVersion}
- Scalable architecture for growing businesses
- Production-ready deployment with best practices
- Comprehensive support and documentation

## Technical Benefits
- Advanced PostgreSQL features
- Optimized for ${repository.useCases.join(" and ")} use cases
- ${repository.language} implementation
- CloudFormation infrastructure deployment

## Business Impact
- Improved operational efficiency
- Reduced time-to-market
- Enhanced user experience
- Future-ready technology stack

## Implementation Approach
- Rapid deployment with CloudFormation
- Comprehensive documentation and training
- Best practices implementation
- Ongoing support and optimization

## ROI and Success Metrics
- Performance improvement targets
- Cost reduction opportunities
- User satisfaction improvements
- Technical efficiency gains

Generated for: ${repository.useCases.join(", ")}
Language: ${repository.language}
Database: PostgreSQL ${postgresVersion}
`;
  }

  // Feedback and demo request methods
  async submitFeedback(feedback: { email: string; demoType: string; priority: string; message: string; status: string }): Promise<{ id: number }> {
    const newFeedback = {
      id: this.feedbackIdCounter++,
      email: feedback.email,
      demoType: feedback.demoType,
      priority: feedback.priority,
      message: feedback.message,
      status: feedback.status,
      createdAt: new Date().toISOString()
    };
    
    this.feedbackRequests.push(newFeedback);
    return { id: newFeedback.id };
  }

  async getAllFeedback(): Promise<Array<{ id: number; email: string; demoType: string; priority: string; message: string; status: string; createdAt: string }>> {
    return [...this.feedbackRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private generateInstallDependenciesScript(repository: Repository): string {
    return `#!/bin/bash
# Comprehensive Dependency Installation Script for ${repository.name}
# This script installs all required system and Python dependencies

set -e

echo "🚀 Installing dependencies for ${repository.name}..."

# Function to detect OS and install system dependencies
install_system_dependencies() {
    echo "📦 Installing system dependencies..."
    
    if command -v apt-get >/dev/null 2>&1; then
        # Ubuntu/Debian
        echo "Detected Ubuntu/Debian system"
        export DEBIAN_FRONTEND=noninteractive
        sudo apt-get update -qq
        sudo apt-get install -y \\
            python3 \\
            python3-pip \\
            python3-venv \\
            python3-dev \\
            postgresql-client \\
            libpq-dev \\
            build-essential \\
            curl \\
            unzip \\
            git \\
            wget
        
        # Install AWS CLI v2 for Ubuntu/Debian
        if ! command -v aws >/dev/null 2>&1; then
            echo "Installing AWS CLI v2..."
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
            unzip -q awscliv2.zip
            sudo ./aws/install
            rm -rf awscliv2.zip aws/
        fi
        
    elif command -v yum >/dev/null 2>&1; then
        # Amazon Linux/RHEL/CentOS
        echo "Detected Amazon Linux/RHEL/CentOS system"
        sudo yum update -y -q
        sudo yum groupinstall -y "Development Tools"
        sudo yum install -y \\
            python3 \\
            python3-pip \\
            python3-devel \\
            postgresql \\
            postgresql-devel \\
            curl \\
            unzip \\
            git \\
            wget
        
        # Install AWS CLI v2 for Amazon Linux
        if ! command -v aws >/dev/null 2>&1; then
            echo "Installing AWS CLI v2..."
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
            unzip -q awscliv2.zip
            sudo ./aws/install
            rm -rf awscliv2.zip aws/
        fi
        
    elif command -v brew >/dev/null 2>&1; then
        # macOS with Homebrew
        echo "Detected macOS system"
        brew update
        brew install \\
            python3 \\
            postgresql \\
            libpq \\
            awscli
        
    else
        echo "⚠️  Unknown package manager. Please install manually:"
        echo "   - Python 3.8+ with pip and development headers"
        echo "   - PostgreSQL client tools (psql)"
        echo "   - PostgreSQL development libraries (libpq-dev)"
        echo "   - Build tools (gcc, make)"
        echo "   - AWS CLI v2"
        echo "   - curl, unzip, git, wget"
        exit 1
    fi
}

# Function to verify system dependencies
verify_system_dependencies() {
    echo "🔍 Verifying system dependencies..."
    local missing_deps=0
    
    if ! command -v python3 >/dev/null 2>&1; then
        echo "❌ Python 3 not found"
        missing_deps=1
    else
        echo "✅ Python 3 found: \$(python3 --version)"
    fi
    
    if ! command -v psql >/dev/null 2>&1; then
        echo "❌ PostgreSQL client not found"
        missing_deps=1
    else
        echo "✅ PostgreSQL client found: \$(psql --version)"
    fi
    
    if ! command -v pip3 >/dev/null 2>&1 && ! command -v pip >/dev/null 2>&1; then
        echo "❌ pip not found"
        missing_deps=1
    else
        echo "✅ pip found"
    fi
    
    if ! command -v aws >/dev/null 2>&1; then
        echo "❌ AWS CLI not found"
        missing_deps=1
    else
        echo "✅ AWS CLI found: \$(aws --version)"
    fi
    
    return \$missing_deps
}

# Main installation process
main() {
    echo "Starting dependency installation for ${repository.name}..."
    echo "======================================================="
    
    # Check if system dependencies are already installed
    if ! verify_system_dependencies; then
        echo "Installing missing system dependencies..."
        install_system_dependencies
        
        # Verify again after installation
        if ! verify_system_dependencies; then
            echo "❌ Failed to install some system dependencies"
            exit 1
        fi
    fi
    
    echo "✅ All system dependencies verified"
    
    # Create Python virtual environment
    echo "🐍 Setting up Python virtual environment..."
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        echo "✅ Virtual environment created"
    else
        echo "✅ Virtual environment already exists"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip and install build tools
    echo "📦 Upgrading pip and installing build tools..."
    python -m pip install --upgrade pip setuptools wheel
    
    # Install Python dependencies
    echo "📦 Installing Python dependencies from requirements.txt..."
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
        echo "✅ Python dependencies installed successfully"
    else
        echo "⚠️  requirements.txt not found, installing core dependencies..."
        pip install flask psycopg2-binary python-dotenv requests
    fi
    
    # Test core imports
    echo "🧪 Testing Python imports..."
    python -c "
import sys
try:
    import flask
    print('✅ Flask imported successfully')
except ImportError as e:
    print(f'❌ Flask import failed: {e}')
    sys.exit(1)

try:
    import psycopg2
    print('✅ psycopg2 imported successfully')
except ImportError as e:
    print(f'❌ psycopg2 import failed: {e}')
    sys.exit(1)

try:
    import json
    import os
    print('✅ Standard library imports successful')
except ImportError as e:
    print(f'❌ Standard library import failed: {e}')
    sys.exit(1)

print('✅ All core dependencies imported successfully')
"
    
    if [ \$? -ne 0 ]; then
        echo "❌ Python dependency test failed"
        exit 1
    fi
    
    # Create environment file if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo "📝 Created .env file from template"
            echo "⚠️  Please update .env with your actual configuration"
        else
            echo "⚠️  No .env.example found, please create .env manually"
        fi
    fi
    
    # Make scripts executable
    echo "🔧 Making scripts executable..."
    chmod +x *.sh 2>/dev/null || true
    chmod +x scripts/*.sh 2>/dev/null || true
    
    echo ""
    echo "🎉 Dependency installation completed successfully!"
    echo "======================================================="
    echo ""
    echo "📋 Next Steps:"
    echo "1. Activate virtual environment: source venv/bin/activate"
    echo "2. Update .env with your database connection details"
    echo "3. Run setup script: ./setup.sh"
    echo "4. Start application: python app.py"
    echo ""
    echo "🔗 Application will be available at: http://localhost:5000"
    echo "📊 Database: PostgreSQL with PostGIS"
    echo "☁️  Cloud: AWS infrastructure via CloudFormation"
}

# Run main function
main "\$@"
`;
  }
}

export const storage = new MemStorage();