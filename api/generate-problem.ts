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
    const { topic, difficulty, language = 'javascript' } = req.body;

    if (!topic || !difficulty) {
      return res.status(400).json({ error: 'Please provide topic and difficulty.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const languageTemplates: Record<string, string> = {
      javascript: 'JavaScript with function syntax',
      python: 'Python with def main(): style',
      c: 'C with #include <stdio.h> and int main()',
      cpp: 'C++ with #include <bits/stdc++.h> and int main()',
      java: 'Java with class Main { public static void main(String[] args) }'
    };

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

    return res.status(200).json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Generate problem error:', error);
    return res.status(500).json({ error: 'Unable to generate problem. Please try again.' });
  }
}
