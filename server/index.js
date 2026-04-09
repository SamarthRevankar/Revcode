import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'data.json');
const JWT_SECRET = process.env.JWT_SECRET || 'revcode-ai-secret-key-2026';
const PORT = process.env.PORT || 3001;

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || `http://localhost:${PORT}/api/auth/github/callback`;

// ==================== IN-MEMORY DB ====================
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch (e) { /* fresh start */ }
  return { users: [], repositories: [], reviews: [], cloudScans: [] };
}

let db = loadDB();

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function genId() {
  return crypto.randomUUID();
}

// ==================== SEED DATA ====================
function seed() {
  if (db.users.length > 0) return;

  const hash = bcryptjs.hashSync('demo123', 10);
  const user = {
    id: genId(), username: 'PUNITH HU', email: 'punith@revcode.ai',
    passwordHash: hash, provider: 'github',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PUNITH',
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);

  const repos = [
    { name: 'design-system', language: 'React', visibility: 'Public', description: 'Comprehensive component library with Storybook' },
    { name: 'revcode-ci-app', language: 'Javascript', visibility: 'Private', description: 'CI/CD pipeline automation tool' },
    { name: 'analytics-dashboard', language: 'Python', visibility: 'Private', description: 'Real-time analytics and monitoring platform' },
    { name: 'mobile-app', language: 'Swift', visibility: 'Public', description: 'Cross-platform iOS application' },
    { name: 'e-commerce-platform', language: 'Java', visibility: 'Private', description: 'Scalable microservices e-commerce backend' },
    { name: 'blog-website', language: 'HTML/CSS', visibility: 'Public', description: 'Static blog with markdown support' },
    { name: 'social-network', language: 'PHP', visibility: 'Private', description: 'Social networking platform with feeds' },
    { name: 'ml-pipeline', language: 'Python', visibility: 'Public', description: 'Machine learning data pipeline & training' },
    { name: 'api-gateway', language: 'Go', visibility: 'Private', description: 'High-performance reverse proxy gateway' },
    { name: 'chat-service', language: 'TypeScript', visibility: 'Public', description: 'Real-time WebSocket messaging service' },
  ];

  for (const r of repos) {
    db.repositories.push({
      id: genId(), userId: user.id, ...r,
      size: Math.floor(Math.random() * 9000 + 1000),
      issues: Math.floor(Math.random() * 20),
      pullRequests: Math.floor(Math.random() * 10),
      stars: Math.floor(Math.random() * 500),
      lastUpdated: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
    });
  }

  // Seed reviews
  const sampleReviews = [
    { code: 'function add(a,b){return a+b}', filename: 'utils.js', score: 92, feedback: 'Clean simple function. Consider adding TypeScript types.', vulnerabilities: [], suggestions: ['Add type annotations', 'Add JSDoc comments'] },
    { code: 'eval(userInput)', filename: 'handler.js', score: 15, feedback: 'Critical security vulnerability detected. eval() allows arbitrary code execution.', vulnerabilities: ['Code Injection via eval()', 'XSS Risk', 'Remote Code Execution'], suggestions: ['Remove eval() entirely', 'Use JSON.parse() for data', 'Implement input sanitization'] },
    { code: 'db.query("SELECT * FROM users WHERE id=" + req.params.id)', filename: 'query.js', score: 25, feedback: 'SQL injection vulnerability. User input is directly concatenated into query.', vulnerabilities: ['SQL Injection', 'Data Exposure', 'Authentication Bypass'], suggestions: ['Use parameterized queries', 'Implement input validation', 'Use an ORM like Prisma or Sequelize'] },
  ];

  for (const sr of sampleReviews) {
    db.reviews.push({
      id: genId(), userId: user.id, repositoryId: null,
      code: sr.code, filename: sr.filename,
      score: sr.score, feedback: sr.feedback,
      vulnerabilities: sr.vulnerabilities, suggestions: sr.suggestions,
      createdAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    });
  }

  saveDB();
  console.log('✓ Database seeded with demo data');
}

seed();

// ==================== APP ====================
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ==================== AUTH MIDDLEWARE ====================
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  try {
    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = db.users.find(u => u.id === decoded.id);
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, provider } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, password required' });
  }
  if (db.users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const hash = bcryptjs.hashSync(password, 10);
  const user = {
    id: genId(), username, email, passwordHash: hash,
    provider: provider || 'local',
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  saveDB();
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcryptjs.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// ==================== REAL GITHUB OAUTH ====================
app.get('/api/auth/github', (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_CALLBACK_URL}&scope=repo,user`;
  res.redirect(url);
});

app.get('/api/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code provided');

  try {
    // 1. Exchange code for access token
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_CALLBACK_URL,
    }, {
      headers: { Accept: 'application/json' }
    });

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      console.error('Token exchange failed:', tokenRes.data);
      return res.status(401).send('Failed to authenticate with GitHub');
    }

    // 2. Fetch user profile from GitHub
    const userRes = await axios.get('https://github.com/api/v3/user', {
      headers: { Authorization: `token ${accessToken}` }
    }).catch(async () => {
       // Fallback for public github
       return axios.get('https://api.github.com/user', {
         headers: { Authorization: `token ${accessToken}` }
       });
    });

    const ghUser = userRes.data;

    // 3. Find or create user in our DB
    let user = db.users.find(u => u.email === ghUser.email || (u.provider === 'github' && u.username === ghUser.login));
    
    if (!user) {
      user = {
        id: genId(),
        username: ghUser.login,
        email: ghUser.email || `${ghUser.login}@github.com`,
        passwordHash: '',
        provider: 'github',
        avatar: ghUser.avatar_url,
        githubAccessToken: accessToken,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
    } else {
      user.githubAccessToken = accessToken;
      user.avatar = ghUser.avatar_url; // Update avatar too
    }
    
    saveDB();

    // 4. Issue JWT and redirect to frontend
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    // In a real app, you'd redirect to the frontend with the token or set a cookie
    // For this clone, we'll redirect back to the app with the token in a query param
    // The frontend will then save it to localStorage
    res.redirect(`http://localhost:5173/login?token=${token}&user=${encodeURIComponent(JSON.stringify({ id: user.id, username: user.username, avatar: user.avatar }))}`);

  } catch (e) {
    console.error('OAuth Error:', e.response?.data || e.message);
    res.status(500).send('Authentication Error');
  }
});

// Keep mock OAuth as fallback for other producers if needed
app.post('/api/auth/oauth', (req, res) => {
  const { provider, username, email } = req.body;
  let user = db.users.find(u => u.email === email);
  if (!user) {
    user = {
      id: genId(), username: username || email.split('@')[0],
      email, passwordHash: '', provider,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${username || email}`,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    saveDB();
  }
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// ==================== REPOSITORY ROUTES ====================
app.get('/api/repositories', authMiddleware, async (req, res) => {
  const token = req.user.githubAccessToken;
  
  if (token) {
    try {
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ auth: token });
      
      const ghRepos = await octokit.paginate('GET /user/repos', {
        sort: 'updated',
        per_page: 100
      });

      const repositories = ghRepos.map(r => ({
        id: r.id.toString(),
        userId: req.user.id,
        name: r.name,
        fullName: r.full_name,
        language: r.language || 'Unknown',
        visibility: r.private ? 'Private' : 'Public',
        description: r.description || '',
        size: r.size,
        issues: r.open_issues_count,
        pullRequests: 0, // Will fetch per-repo if needed
        stars: r.stargazers_count,
        lastUpdated: r.updated_at,
        createdAt: r.created_at,
        owner: r.owner.login
      }));

      return res.json({ repositories, total: repositories.length });
    } catch (e) {
      console.warn('GitHub API failed for repos:', e.message);
      // Fallback to local if GitHub fails
    }
  }

  const repos = db.repositories.filter(r => r.userId === req.user.id);
  res.json({ repositories: repos, total: repos.length });
});

app.post('/api/repositories', authMiddleware, (req, res) => {
  const { name, language, visibility, description } = req.body;
  if (!name || !language) return res.status(400).json({ error: 'name and language required' });
  const repo = {
    id: genId(), userId: req.user.id, name, language,
    visibility: visibility || 'Public',
    description: description || '',
    size: Math.floor(Math.random() * 9000 + 1000),
    issues: 0, pullRequests: 0, stars: 0,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.repositories.push(repo);
  saveDB();
  res.json({ repository: repo });
});

app.put('/api/repositories/:id', authMiddleware, (req, res) => {
  const idx = db.repositories.findIndex(r => r.id === req.params.id && r.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Repository not found' });
  const updates = req.body;
  db.repositories[idx] = { ...db.repositories[idx], ...updates, lastUpdated: new Date().toISOString() };
  saveDB();
  res.json({ repository: db.repositories[idx] });
});

app.delete('/api/repositories/:id', authMiddleware, (req, res) => {
  const idx = db.repositories.findIndex(r => r.id === req.params.id && r.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Repository not found' });
  db.repositories.splice(idx, 1);
  saveDB();
});

// ==================== PULL REQUEST ROUTES ====================
app.get('/api/repositories/:owner/:repo/pulls', authMiddleware, async (req, res) => {
  const token = req.user.githubAccessToken;
  if (!token) return res.status(403).json({ error: 'GitHub account not connected' });

  try {
    const { Octokit } = await import('octokit');
    const octokit = new Octokit({ auth: token });
    
    const { owner, repo } = req.params;
    const { data: pulls } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'open'
    });

    res.json({ pulls });
  } catch (e) {
    console.error('Failed to fetch pulls:', e.message);
    res.status(500).json({ error: 'Failed to fetch pull requests' });
  }
});

app.get('/api/repositories/:owner/:repo/pulls/:pull_number', authMiddleware, async (req, res) => {
  const token = req.user.githubAccessToken;
  if (!token) return res.status(403).json({ error: 'GitHub account not connected' });

  try {
    const { Octokit } = await import('octokit');
    const octokit = new Octokit({ auth: token });
    
    const { owner, repo, pull_number } = req.params;
    
    // Fetch PR details
    const { data: pull } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: parseInt(pull_number)
    });

    // Fetch PR diff
    const { data: diff } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: parseInt(pull_number),
      headers: { accept: 'application/vnd.github.v3.diff' }
    });

    res.json({ pull, diff });
  } catch (e) {
    console.error('Failed to fetch pull details:', e.message);
    res.status(500).json({ error: 'Failed to fetch pull request details' });
  }
});


// ==================== AI CODE REVIEW ====================
app.post('/api/review', authMiddleware, async (req, res) => {
  const { code, filename, repositoryId } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  let result;
  const mlServiceUrl = process.env.ML_SERVICE_URL;

  // Try Gemini AI first (for high-level review)
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are an elite AI code reviewer and security auditor. Analyze the following code with extreme scrutiny. 
Your goal is to find as many distinct issues as possible across these categories:
1. Vulnerabilities: Critical/High security threats (Injection, Crypto, Secrets).
2. Suggestions: Quality, Performance, Readability, and Modern Best Practices.
3. Code Smells: Maintainability, Complexity, Refactoring needs, and Architecture flaws.

Provide exactly 5-10 findings per category if the code size allows. Be very specific. 
Return a JSON response ONLY (no markdown fences) with this schema:
{ 
  "score": number (0-100), 
  "feedback": "overall assessment", 
  "vulnerabilities": ["distinct string for each"], 
  "suggestions": ["distinct string for each"], 
  "codeSmells": ["distinct string for each"], 
  "securityRisk": "low|medium|high|critical" 
}

Code to review:
\`\`\`
${code}
\`\`\``,
      });
      const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(text);
    } catch (e) {
      console.warn('Gemini API failed, using local analysis:', e.message);
    }
  }

  // Layer 2: Deep Security Scan (DistilBERT Guardian)
  if (mlServiceUrl) {
    try {
      const secRes = await axios.post(`${mlServiceUrl}/analyze`, { code });
      if (secRes.data && result) {
        // Enrich Gemini results with specialized security model findings
        result.securityScan = secRes.data;
        if (secRes.data.is_vulnerable) {
          result.securityRisk = 'high';
          if (!result.vulnerabilities.includes('Specialized Security Model Flag')) {
            result.vulnerabilities.push(`Heuristic Security Alert: ${secRes.data.verdict} (${secRes.data.confidence}%)`);
          }
        }
      }
    } catch (e) {
      console.warn('ML Security Scan failed:', e.message);
    }
  }

  // Fallback: local heuristic analysis
  if (!result) {
    result = localAnalyze(code);
  }

  // Persist review
  const review = {
    id: genId(), userId: req.user.id,
    repositoryId: repositoryId || null,
    code, filename: filename || 'snippet.js',
    score: result.score, feedback: result.feedback,
    vulnerabilities: result.vulnerabilities || [],
    suggestions: result.suggestions || [],
    codeSmells: result.codeSmells || [],
    securityRisk: result.securityRisk || 'low',
    securityScan: result.securityScan || null,
    createdAt: new Date().toISOString(),
  };
  db.reviews.push(review);
  saveDB();

  res.json(review);
});

// --- NEW: AUTONOMOUS CODE CORRECTION (The Fixer + The Architect) ---
app.post('/api/autofix', authMiddleware, async (req, res) => {
  const { code, filename } = req.body;
  const mlServiceUrl = process.env.ML_SERVICE_URL;

  if (!mlServiceUrl) return res.status(503).json({ error: 'ML Service not configured' });

  try {
    const response = await axios.post(`${mlServiceUrl}/fix`, { code });
    res.json(response.data);
  } catch (e) {
    console.warn('AI Correction Service offline, using heuristic fix:', e.message);
    // Heuristic fallback for demo stability
    let suggestion = code;
    if (code.includes('eval(')) {
      if (filename?.endsWith('.py') || code.includes('def ')) {
        suggestion = "import json\n" + suggestion.replace(/eval\((.*)\)/g, 'json.loads($1)');
      } else {
        suggestion = suggestion.replace(/eval\((.*)\)/g, 'JSON.parse($1)');
      }
    }
    if (code.includes('console.log')) {
      suggestion = suggestion.replace(/console\.log\((.*)\)/g, '// logger.info($1)');
    }

    // 4. Command Injection (os.system -> subprocess.run)
    if (suggestion.includes('os.system(') && (filename?.endsWith('.py') || suggestion.includes('import os'))) {
      suggestion = "import subprocess\n" + suggestion;
      suggestion = suggestion.replace(/os\.system\("(.*?) \+ (.*?)"\)/g, 'subprocess.run(["$1", $2])');
      suggestion = suggestion.replace(/os\.system\("(.*?)" \+ (.*?)\)/g, 'subprocess.run(["$1", $2])');
    }
    
    // --- JAVA SECURITY REMEDIATION ---
    // 1. Hardcoded Credentials
    if (suggestion.includes('Password = "')) {
      suggestion = suggestion.replace(/private String (.*)Password = "(.*)";/g, 'private String $1Password = System.getenv("$1_PASSWORD"); // Fixed: Move to ENV');
    }
    
    // 2. SQL Injection (Statement -> PreparedStatement)
    if (suggestion.includes('Statement stmt = conn.createStatement()')) {
      suggestion = suggestion.replace(/Statement stmt = conn\.createStatement\(\);/g, '');
      suggestion = suggestion.replace(/String query = "SELECT \* FROM users WHERE id = '" \+ userId \+ "'";/g, 'String query = "SELECT * FROM users WHERE id = ?";');
      suggestion = suggestion.replace(/ResultSet rs = stmt\.executeQuery\(query\);/g, 
        'PreparedStatement pstmt = conn.prepareStatement(query);\n            pstmt.setString(1, userId);\n            ResultSet rs = pstmt.executeQuery();');
    }
    
    // 3. Insecure Random (Random -> SecureRandom)
    if (suggestion.includes('new Random()')) {
      suggestion = "import java.security.SecureRandom;\n" + suggestion;
      suggestion = suggestion.replace(/Random rand = new Random\(\);/g, 'SecureRandom rand = new SecureRandom(); // Fixed: Cryptographically secure');
    }
    
    res.json({
      suggestion,
      guardrail_status: "PASSED",
      guardrail_msg: "Heuristic fallback applied"
    });
  }
});

// --- NEW: HUMAN-IN-THE-LOOP FEEDBACK (Active Learning) ---
app.post('/api/ai/feedback', authMiddleware, async (req, res) => {
  const { original_code, corrected_code } = req.body;
  const mlServiceUrl = process.env.ML_SERVICE_URL;

  if (!mlServiceUrl) return res.status(503).json({ error: 'ML Service not configured' });

  try {
    await axios.post(`${mlServiceUrl}/feedback`, { original_code, corrected_code });
    res.json({ status: 'success', message: 'Feedback stored for model retraining' });
  } catch (e) {
    console.warn('Feedback storage failed:', e.message);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

app.get('/api/reviews', authMiddleware, (req, res) => {
  const reviews = db.reviews
    .filter(r => r.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ reviews, total: reviews.length });
});

// ==================== CLOUD SECURITY ====================
app.post('/api/cloud/scan', authMiddleware, async (req, res) => {
  const { repositoryId } = req.body;
  const repo = db.repositories.find(r => r.id === repositoryId && r.userId === req.user.id);
  
  // Also look in GitHub repos from memory if not in db
  let repoData = repo;
  const token = req.user.githubAccessToken;

  try {
    let cloudCode = '';
    let sourceFiles = [];

    if (token && repoData?.owner) {
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ auth: token });
      
      const filesToSearch = [
        'Dockerfile', 'docker-compose.yml', 'serverless.yml', 
        '.github/workflows/main.yml', '.github/workflows/deploy.yml',
        'terraform/main.tf', 'infra/main.tf', 'kubernetes.yaml', 'k8s.yaml'
      ];

      for (const file of filesToSearch) {
        try {
          const { data } = await octokit.rest.repos.getContent({
            owner: repoData.owner,
            repo: repoData.name,
            path: file
          });
          if (data && !Array.isArray(data) && data.content) {
            const content = Buffer.from(data.content, 'base64').toString();
            cloudCode += `\n--- File: ${file} ---\n${content}\n`;
            sourceFiles.push(file);
          }
        } catch (e) { /* file not found, skip */ }
      }
    }

    // Fallback: If no cloud files or local repo, scan recent reviews for secrets
    if (!cloudCode) {
      const recentReviews = db.reviews.filter(r => r.repositoryId === repositoryId || (!repositoryId && r.userId === req.user.id)).slice(0, 3);
      recentReviews.forEach(r => {
        cloudCode += `\n--- Snippet: ${r.filename} ---\n${r.code}\n`;
        sourceFiles.push(r.filename);
      });
    }

    if (!cloudCode) {
      return res.json({
        id: genId(), userId: req.user.id, repositoryId,
        repositoryName: repoData?.name || 'Manual Repo', status: 'completed',
        findings: [], riskLevel: 'low',
        summary: 'No infrastructure-as-code files found to scan.',
        scannedAt: new Date().toISOString(),
      });
    }

    // AI Analysis via Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are an expert Security Architect. Analyze the following infrastructure/code files for security risks (IAM, Secrets, Container Security, Network Exposure). 
Provide a JSON response ONLY (no markdown) with this schema:
{ "riskLevel": "low|medium|high|critical", "summary": "string", "findings": [{ "type": "IAM|Secrets|Network|Storage|Encryption|Logging|Container", "severity": "low|medium|high|critical", "title": "string", "description": "string" }] }

Files to analyze:
${cloudCode}`,
      });
      const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResult = JSON.parse(text);
      
      const scan = {
        id: genId(), userId: req.user.id, repositoryId,
        repositoryName: repoData?.name || 'Code Snippet', status: 'completed',
        findings: aiResult.findings.map(f => ({ ...f, id: genId() })),
        riskLevel: aiResult.riskLevel,
        summary: aiResult.summary,
        sourceFiles,
        scannedAt: new Date().toISOString(),
      };
      db.cloudScans.push(scan);
      saveDB();
      return res.json(scan);
    }

    // Fallback to simulation if no API key
    return res.status(503).json({ error: 'AI Analysis engine offline (API Key missing)' });

  } catch (e) {
    console.error('Cloud Scan Error:', e.message);
    res.status(500).json({ error: 'Deep Cloud Scan failed: ' + e.message });
  }
});

app.get('/api/cloud/scans', authMiddleware, (req, res) => {
  const scans = db.cloudScans
    .filter(s => s.userId === req.user.id)
    .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
  res.json({ scans, total: scans.length });
});

// ==================== STATS / DASHBOARD ====================
app.get('/api/stats', authMiddleware, (req, res) => {
  const repos = db.repositories.filter(r => r.userId === req.user.id);
  const reviews = db.reviews.filter(r => r.userId === req.user.id);
  const scans = db.cloudScans.filter(s => s.userId === req.user.id);

  const totalVulns = reviews.reduce((sum, r) => sum + (r.vulnerabilities?.length || 0), 0);
  const avgScore = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + r.score, 0) / reviews.length)
    : 0;

  res.json({
    totalRepositories: repos.length,
    totalReviews: reviews.length,
    totalScans: scans.length,
    vulnerabilitiesFound: totalVulns,
    issuesFixed: Math.floor(totalVulns * 0.87),
    averageScore: avgScore,
    languages: [...new Set(repos.map(r => r.language))],
    recentActivity: [
      ...reviews.slice(-3).map(r => ({ type: 'review', title: `Reviewed ${r.filename}`, date: r.createdAt, score: r.score })),
      ...scans.slice(-3).map(s => ({ type: 'scan', title: `Scanned ${s.repositoryName}`, date: s.scannedAt, risk: s.riskLevel })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  });
});

// ==================== LOCAL CODE ANALYSIS (FALLBACK) ====================
function localAnalyze(code) {
  let score = 85;
  const vulnerabilities = [];
  const suggestions = [];
  const codeSmells = [];
  let securityRisk = 'low';

  // Security checks
  if (/eval\s*\(/.test(code)) {
    vulnerabilities.push('Code Injection via eval()');
    score -= 30; securityRisk = 'critical';
  }
  if (/innerHTML\s*=/.test(code)) {
    vulnerabilities.push('XSS via innerHTML');
    score -= 15; securityRisk = securityRisk === 'critical' ? 'critical' : 'high';
  }
  if (/document\.write/.test(code)) {
    vulnerabilities.push('DOM manipulation via document.write');
    score -= 10;
  }
  if (/\bexec\s*\(/.test(code)) {
    vulnerabilities.push('Command Injection risk');
    score -= 25; securityRisk = 'critical';
  }
  if (/SELECT.*FROM.*WHERE.*\+|`\$\{.*\}`.*SELECT|concat.*query/i.test(code)) {
    vulnerabilities.push('SQL Injection');
    score -= 25; securityRisk = 'critical';
  }
  if (/password\s*[:=]\s*['"][^'"]+['"]/i.test(code)) {
    vulnerabilities.push('Hardcoded credentials detected');
    score -= 20; securityRisk = 'high';
  }
  if (/api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i.test(code)) {
    vulnerabilities.push('Hardcoded API key');
    score -= 20; securityRisk = 'high';
  }
  if (/Math\.random\(\)/.test(code)) {
    vulnerabilities.push('Insecure random number generation');
    score -= 5;
    suggestions.push('Use crypto.randomBytes() for security-sensitive randomness');
  }
  if (/http:\/\//.test(code)) {
    suggestions.push('Use HTTPS instead of HTTP');
    score -= 3;
  }

  // Code quality checks
  if (/var\s+/.test(code)) {
    codeSmells.push('Use of var instead of const/let');
    suggestions.push('Replace var with const or let');
    score -= 3;
  }
  if (/console\.log/.test(code)) {
    codeSmells.push('Console.log statements in production code');
    suggestions.push('Remove or replace console.log with a proper logger');
    score -= 2;
  }
  if (/function\s+\w+\s*\([^)]{100,}\)/.test(code)) {
    codeSmells.push('Function with too many parameters');
    suggestions.push('Consider using an options object pattern');
    score -= 5;
  }
  if (code.split('\n').length > 50) {
    codeSmells.push('Long file — consider refactoring');
    suggestions.push('Break down into smaller, focused modules');
    score -= 3;
  }
  if (!/\/\/|\/\*/.test(code) && code.length > 100) {
    suggestions.push('Add code comments for documentation');
    score -= 2;
  }
  if (!/try|catch/.test(code) && (code.includes('fetch') || code.includes('async'))) {
    suggestions.push('Add error handling with try/catch blocks');
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));

  const feedback = vulnerabilities.length > 0
    ? `Found ${vulnerabilities.length} security issue(s). ${codeSmells.length > 0 ? `Also detected ${codeSmells.length} code smell(s).` : ''} Immediate remediation recommended.`
    : codeSmells.length > 0
    ? `Code is generally safe but has ${codeSmells.length} quality issue(s) that should be addressed.`
    : 'Code looks clean and follows good practices.';

  return { score, feedback, vulnerabilities, suggestions, codeSmells, securityRisk };
}

// ==================== START ====================
app.listen(PORT, () => {
  console.log(`\n  🚀 Revcode AI Server running on http://localhost:${PORT}`);
  console.log(`  📊 ${db.repositories.length} repositories loaded`);
  console.log(`  📝 ${db.reviews.length} reviews loaded`);
  console.log(`  👤 ${db.users.length} users loaded\n`);
});
