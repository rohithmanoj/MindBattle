

import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, Contest } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getQuizSchema = (count: number) => ({
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        description: `An array of ${count} quiz questions.`,
        items: {
          type: Type.OBJECT,
          properties: {
            question: {
              type: Type.STRING,
              description: "The text of the quiz question.",
            },
            options: {
              type: Type.ARRAY,
              description: "An array of exactly 4 possible answers.",
              items: {
                type: Type.STRING,
              },
            },
            answer: {
              type: Type.STRING,
              description: "The correct answer, which must be one of the strings from the 'options' array.",
            },
          },
          required: ['question', 'options', 'answer']
        },
      }
    },
    required: ['questions']
});


const getContestSchema = (count: number) => ({
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A catchy and relevant title for the quiz contest." },
        description: { type: Type.STRING, description: "A brief, engaging description of the contest." },
        category: { type: Type.STRING, description: "The primary category of the contest topic." },
        rules: { type: Type.STRING, description: "A summary of the rules for the contest." },
        questions: getQuizSchema(count).properties.questions, // Re-use the questions schema
    },
    required: ['title', 'description', 'category', 'rules', 'questions']
});


export const generateQuiz = async (category: string, numberOfQuestions: number = 15): Promise<QuizQuestion[]> => {
  try {
    const prompt = `Generate a set of ${numberOfQuestions} multiple-choice trivia questions for a quiz game like 'Who Wants to Be a Millionaire?'.
    The category is "${category}".
    The questions should gradually increase in difficulty. The first few should be easy, the middle ones medium, and the final ones should be very difficult.
    Each question must have exactly 4 options.
    For each question, specify the correct answer, ensuring it is an exact match to one of the options.
    Return the output in the specified JSON format.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: getQuizSchema(numberOfQuestions),
        },
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid format: 'questions' array not found.");
    }

    return parsed.questions as QuizQuestion[];

  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz from API. Please check your API key and try again.");
  }
};

export const generateContestWithAI = async (topic: string, ageGroup: string, difficulty: string, numberOfQuestions: number = 15): Promise<Partial<Contest>> => {
    try {
        const prompt = `Generate a complete quiz contest based on the following criteria:
        - Topic: "${topic}"
        - Target Age Group: ${ageGroup}
        - Difficulty Level: ${difficulty}

        Create a suitable title, a short and exciting description, a relevant category, and a brief set of rules for the contest.
        Also, generate a set of ${numberOfQuestions} multiple-choice trivia questions on the specified topic. The questions should be appropriate for the target age and difficulty.
        The difficulty should ramp up: the first few questions should be easy, the middle ones medium, and the final ones very difficult.
        Each question must have exactly 4 answer options, with one clearly correct answer.
        
        Return the entire contest structure in the specified JSON format.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: getContestSchema(numberOfQuestions),
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);

        if (!parsed.title || !parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error("Invalid format received from AI.");
        }
        
        // The service returns a partial contest object that the admin can then finalize
        return {
            title: parsed.title,
            description: parsed.description,
            category: parsed.category,
            rules: parsed.rules,
            questions: parsed.questions,
            numberOfQuestions: parsed.questions.length,
        };

    } catch (error) {
        console.error("Error generating contest with AI:", error);
        throw new Error("Failed to generate contest from API. Please check your prompt and API key.");
    }
};


export const askTheAI = async (question: QuizQuestion): Promise<string> => {
    try {
        const prompt = `I'm in a quiz game. Here is the question: "${question.question}"
        The options are: ${question.options.join(', ')}.
        Which option is the most likely correct answer and why? Provide a brief explanation. Start your response with "I think the correct answer is..."`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error asking the AI:", error);
        return "Sorry, I'm unable to provide a hint at this moment.";
    }
};

export const generateTransactionDescription = async (keywords: string, amount: number): Promise<string> => {
    try {
        const direction = amount > 0 ? "credit" : "debit";
        const prompt = `An admin is performing a wallet adjustment for a user.
        The amount is a ${direction} of $${Math.abs(amount)}.
        The keywords provided by the admin for the reason are: "${keywords}".
        
        Based on this, generate a clear, professional, and concise transaction description for the user's transaction history.
        The description should start with "Admin adjustment:". For example, "Admin adjustment: Bonus for winning community event." or "Admin adjustment: Correction for contest payout error."`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.5,
                maxOutputTokens: 50,
            },
        });

        const description = response.text.trim();
        // Basic cleanup in case the model adds quotes
        return description.replace(/^"|"$/g, '');

    } catch (error) {
        console.error("Error generating transaction description:", error);
        // Fallback description
        return `Admin adjustment: ${keywords}`;
    }
};
