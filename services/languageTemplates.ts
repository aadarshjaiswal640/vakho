export type SupportedLanguage = 'javascript' | 'python' | 'c' | 'cpp' | 'java';

export interface LanguageConfig {
  id: SupportedLanguage;
  name: string;
  prismLanguage: string;
  starterTemplate: string;
}

export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    prismLanguage: 'javascript',
    starterTemplate: `function solution(input) {
  // Your code here
  
  return result;
}

// Example usage:
// console.log(solution([2, 7, 11, 15], 9));`
  },
  {
    id: 'python',
    name: 'Python',
    prismLanguage: 'python',
    starterTemplate: `def solution(input):
    # Your code here
    
    return result

# Example usage:
# if __name__ == "__main__":
#     print(solution([2, 7, 11, 15], 9))`
  },
  {
    id: 'c',
    name: 'C',
    prismLanguage: 'c',
    starterTemplate: `#include <stdio.h>
#include <stdlib.h>

int* solution(int* nums, int numsSize, int target, int* returnSize) {
    // Your code here
    
    return NULL;
}

int main() {
    // Test your solution here
    return 0;
}`
  },
  {
    id: 'cpp',
    name: 'C++',
    prismLanguage: 'cpp',
    starterTemplate: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> solve(vector<int>& nums, int target) {
        // Your code here
        
        return {};
    }
};

int main() {
    // Test your solution here
    return 0;
}`
  },
  {
    id: 'java',
    name: 'Java',
    prismLanguage: 'java',
    starterTemplate: `import java.util.*;

class Main {
    public static int[] solution(int[] nums, int target) {
        // Your code here
        
        return new int[]{};
    }

    public static void main(String[] args) {
        // Test your solution here
    }
}`
  }
];

export const getLanguageConfig = (id: SupportedLanguage): LanguageConfig => {
  return LANGUAGE_CONFIGS.find(lang => lang.id === id) || LANGUAGE_CONFIGS[0];
};

export const getStarterTemplate = (id: SupportedLanguage): string => {
  return getLanguageConfig(id).starterTemplate;
};
