// In-memory database using Map objects (no native dependencies needed)
// This provides full CRUD with persistence via JSON file

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'data.json');

// Load or initialize database
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Could not load DB file, starting fresh.');
  }
  return { users: [], repositories: [], reviews: [], cloudScans: [] };
}

let db = loadDB();

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function generateId() {
  return crypto.randomUUID();
}

// ========== USERS ==========
export function createUser(username, email, passwordHash, provider = 'local') {
  const user = {
    id: generateId(),
    username,
    email,
    passwordHash,
    provider,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
    githubAccessToken: null,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  saveDB();
  return user;
}

export function findUserByEmail(email) {
  return db.users.find(u => u.email === email) || null;
}

export function findUserById(id) {
  return db.users.find(u => u.id === id) || null;
}

export function getAllUsers() {
  return db.users;
}

// ========== REPOSITORIES ==========
export function createRepository(userId, name, language, visibility = 'Public', description = '') {
  const repo = {
    id: generateId(),
    userId,
    name,
    language,
    visibility,
    description,
    size: Math.floor(Math.random() * 9000 + 1000),
    issues: Math.floor(Math.random() * 20),
    pullRequests: Math.floor(Math.random() * 10),
    stars: Math.floor(Math.random() * 500),
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.repositories.push(repo);
  saveDB();
  return repo;
}

export function getRepositoriesByUser(userId) {
  return db.repositories.filter(r => r.userId === userId);
}

export function getRepositoryById(id) {
  return db.repositories.find(r => r.id === id) || null;
}

export function getAllRepositories() {
  return db.repositories;
}

export function updateRepository(id, updates) {
  const idx = db.repositories.findIndex(r => r.id === id);
  if (idx === -1) return null;
  db.repositories[idx] = { ...db.repositories[idx], ...updates, lastUpdated: new Date().toISOString() };
  saveDB();
  return db.repositories[idx];
}

export function deleteRepository(id) {
  const idx = db.repositories.findIndex(r => r.id === id);
  if (idx === -1) return false;
  db.repositories.splice(idx, 1);
  saveDB();
  return true;
}

// ========== CODE REVIEWS ==========
export function createReview(userId, repositoryId, code, filename, result) {
  const review = {
    id: generateId(),
    userId,
    repositoryId,
    code,
    filename,
    score: result.score,
    feedback: result.feedback,
    vulnerabilities: result.vulnerabilities || [],
    suggestions: result.suggestions || [],
    createdAt: new Date().toISOString(),
  };
  db.reviews.push(review);
  saveDB();
  return review;
}

export function getReviewsByUser(userId) {
  return db.reviews.filter(r => r.userId === userId).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getReviewsByRepository(repositoryId) {
  return db.reviews.filter(r => r.repositoryId === repositoryId);
}

export function getAllReviews() {
  return db.reviews;
}

// ========== CLOUD SECURITY SCANS ==========
export function createCloudScan(userId, repositoryId, result) {
  const scan = {
    id: generateId(),
    userId,
    repositoryId,
    status: result.status || 'completed',
    findings: result.findings || [],
    riskLevel: result.riskLevel || 'low',
    summary: result.summary || '',
    createdAt: new Date().toISOString(),
  };
  db.cloudScans.push(scan);
  saveDB();
  return scan;
}

export function getCloudScansByUser(userId) {
  return db.cloudScans.filter(s => s.userId === userId);
}

// ========== STATS ==========
export function getStats(userId) {
  const repos = userId ? getRepositoriesByUser(userId) : getAllRepositories();
  const reviews = userId ? getReviewsByUser(userId) : getAllReviews();
  
  const totalVulnerabilities = reviews.reduce((sum, r) => sum + (r.vulnerabilities?.length || 0), 0);
  const avgScore = reviews.length > 0 
    ? Math.round(reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length) 
    : 0;

  return {
    totalRepositories: repos.length,
    totalReviews: reviews.length,
    vulnerabilitiesFound: totalVulnerabilities,
    averageScore: avgScore,
    issuesFixed: Math.floor(totalVulnerabilities * 0.87),
    languagesSupported: 30,
    hoursEstSaved: reviews.length * 2.5,
  };
}

// ========== SEED DATA ==========
export function seedDatabase() {
  if (db.users.length > 0) return; // Already seeded

  // Create demo user
  const bcryptjs = await import('bcryptjs');
  const hash = bcryptjs.hashSync('demo123', 10);
  const user = createUser('PUNITH HU', 'punith@revcode.ai', hash, 'github');

  // Create sample repositories
  const repos = [
    { name: 'design-system', lang: 'React', vis: 'Public', desc: 'A comprehensive component library' },
    { name: 'revcode-ci-app', lang: 'Javascript', vis: 'Private', desc: 'CI/CD pipeline automation tool' },
    { name: 'analytics-dashboard', lang: 'Python', vis: 'Private', desc: 'Real-time analytics platform' },
    { name: 'mobile-app', lang: 'Swift', vis: 'Public', desc: 'Cross-platform mobile application' },
    { name: 'e-commerce-platform', lang: 'Java', vis: 'Private', desc: 'Scalable e-commerce backend' },
    { name: 'blog-website', lang: 'HTML/CSS', vis: 'Public', desc: 'Static blog with markdown support' },
    { name: 'social-network', lang: 'PHP', vis: 'Private', desc: 'Social networking platform' },
    { name: 'ml-pipeline', lang: 'Python', vis: 'Public', desc: 'Machine learning data pipeline' },
    { name: 'api-gateway', lang: 'Go', vis: 'Private', desc: 'High-performance API gateway' },
    { name: 'chat-service', lang: 'TypeScript', vis: 'Public', desc: 'Real-time WebSocket chat service' },
  ];

  for (const r of repos) {
    createRepository(user.id, r.name, r.lang, r.vis, r.desc);
  }

  // Create sample reviews
  const sampleReviews = [
    { code: 'function add(a,b){return a+b}', filename: 'utils.js', result: { score: 92, feedback: 'Clean simple function. Consider adding TypeScript types.', vulnerabilities: [], suggestions: ['Add type annotations', 'Add JSDoc comments'] } },
    { code: 'eval(userInput)', filename: 'handler.js', result: { score: 15, feedback: 'Critical security vulnerability detected.', vulnerabilities: ['Code Injection via eval()', 'XSS Risk', 'Remote Code Execution'], suggestions: ['Remove eval() usage entirely', 'Use JSON.parse() for data parsing', 'Implement input sanitization'] } },
    { code: 'SELECT * FROM users WHERE id = ' + 'req.params.id', filename: 'query.js', result: { score: 25, feedback: 'SQL injection vulnerability detected.', vulnerabilities: ['SQL Injection', 'Data Exposure'], suggestions: ['Use parameterized queries', 'Implement input validation', 'Use an ORM like Prisma'] } },
  ];

  for (const sr of sampleReviews) {
    createReview(user.id, null, sr.code, sr.filename, sr.result);
  }

  console.log('✓ Database seeded with demo data');
}
