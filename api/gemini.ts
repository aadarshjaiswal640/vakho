import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

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
    const { prompt, language } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid request. Please provide a valid prompt.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = language 
      ? `You are a coding mentor. The user is working in ${language}. Provide explanations and code examples in ${language}.`
      : 'You are a coding mentor. Provide helpful explanations and code examples.';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemPrompt}\n\nUser: ${prompt}`,
    });

    return res.status(200).json({ response: response.text });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return res.status(500).json({ error: 'Unable to process your request. Please try again.' });
  }
}
