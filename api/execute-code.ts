import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error. Please try again later.' });
  }

  try {
    const { code, problem, language = 'javascript' } = req.body;

    if (!code || !problem) {
      return res.status(400).json({ error: 'Please provide code and problem details.' });
    }

    const ai = new GoogleGenAI({ apiKey });

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

    return res.status(200).json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Execute code error:', error);
    return res.status(500).json({ 
      passed: false,
      output: 'Unable to execute code. Please try again.',
      details: []
    });
  }
}
