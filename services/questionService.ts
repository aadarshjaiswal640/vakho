import { CodingProblem, ExecutionResult } from "../types";

export class QuestionService {
  
  static async generateProblem(topic: string, difficulty: string, language: string = 'javascript'): Promise<CodingProblem> {
    try {
      const response = await fetch('/api/generate-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, difficulty, language })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate problem');
      }

      return await response.json() as CodingProblem;
    } catch (e: any) {
      console.error("Failed to generate problem", e);
      throw new Error(e.message || 'Unable to generate problem. Please try again.');
    }
  }

  static async executeCode(code: string, problem: CodingProblem, language: string = 'javascript'): Promise<ExecutionResult> {
    try {
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, problem, language })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to execute code');
      }

      return await response.json() as ExecutionResult;
    } catch (e: any) {
      console.error("Execution failed", e);
      return {
        passed: false,
        output: e.message || "Unable to execute code. Please try again.",
        details: []
      };
    }
  }
}
