import dotenv from 'dotenv';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction ? 5000 : 3001;
const DIST_DIR = path.join(__dirname, 'dist');
const apiKey = process.env.GEMINI_API_KEY;

const languageTemplates = {
  javascript: 'JavaScript with function syntax',
  python: 'Python with def main(): style',
  c: 'C with #include <stdio.h> and int main()',
  cpp: 'C++ with #include <bits/stdc++.h> and int main()',
  java: 'Java with class Main { public static void main(String[] args) }'
};

async function handleRequest(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/api/get-session-config' && req.method === 'GET') {
    if (!apiKey) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server configuration error. GEMINI_API_KEY not set.' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ apiKey }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Server configuration error. Please set GEMINI_API_KEY.' }));
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    if (url.pathname === '/api/gemini') {
      const { prompt, language } = data;
      const systemPrompt = language 
        ? `You are a coding mentor. The user is working in ${language}. Provide explanations and code examples in ${language}.`
        : 'You are a coding mentor. Provide helpful explanations and code examples.';

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt}\n\nUser: ${prompt}`,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ response: response.text }));
      return;
    }

    if (url.pathname === '/api/generate-problem') {
      const { topic, difficulty, language = 'javascript' } = data;
      const langTemplate = languageTemplates[language] || languageTemplates.javascript;

      const prompt = `Generate a unique coding problem about ${topic} with ${difficulty} difficulty.
      The code should be in ${langTemplate}.
      Return a JSON object with:
      - title: string
      - difficulty: string
      - description: A full Markdown description including examples.
      - starterCode: The starting code template for the user in ${language}.
      - testCases: A JSON array of objects { input: any, expected: any } to test the code.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              description: { type: Type.STRING },
              starterCode: { type: Type.STRING },
              testCases: { type: Type.STRING },
            },
            required: ["title", "difficulty", "description", "starterCode", "testCases"]
          }
        }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(response.text);
      return;
    }

    if (url.pathname === '/api/execute-code') {
      const { code, problem, language = 'javascript' } = data;

      const prompt = `Act as a code execution engine for ${language}.
      Problem: ${problem.description}
      Test Cases (Hidden): ${problem.testCases}
      
      User Code (${language}):
      ${code}
      
      Evaluate the user's code against the test cases.
      Return JSON:
      - passed: boolean (true if all pass)
      - output: string (console output summary)
      - details: array of { input, expected, actual, passed }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              passed: { type: Type.BOOLEAN },
              output: { type: Type.STRING },
              details: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    input: { type: Type.STRING },
                    expected: { type: Type.STRING },
                    actual: { type: Type.STRING },
                    passed: { type: Type.BOOLEAN }
                  }
                }
              }
            }
          }
        }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(response.text);
      return;
    }

    // In production, serve static files for non-API routes
    if (isProduction) {
      serveStaticFile(url.pathname, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    console.error('API error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unable to process request. Please try again.' }));
  }
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveStaticFile(pathname, res) {
  let filePath = path.join(DIST_DIR, pathname);
  
  // Default to index.html for SPA routing
  if (!path.extname(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fall back to index.html for SPA routing
      fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, data2) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data2);
      });
      return;
    }
    
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(handleRequest);
const HOST = isProduction ? '0.0.0.0' : 'localhost';
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT} (${isProduction ? 'production' : 'development'})`);
  console.log(`GEMINI_API_KEY: ${apiKey ? 'Set' : 'NOT SET'}`);
});
