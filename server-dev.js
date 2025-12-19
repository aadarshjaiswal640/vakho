import dotenv from 'dotenv';
import http from 'http';
import { GoogleGenAI, Type } from '@google/genai';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = 3001;
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

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    console.error('API error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unable to process request. Please try again.' }));
  }
}

const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`);
  console.log(`GEMINI_API_KEY: ${apiKey ? 'Set' : 'NOT SET'}`);
});
