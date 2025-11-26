import { GoogleGenAI, Chat } from "@google/genai";
import { Project } from "../types";

// Singleton instance variable
let aiInstance: GoogleGenAI | null = null;

// Lazy initialization function
const getGenAI = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY is missing. Please set it in Vercel Environment Variables.");
      // We assume the user might set it later or we handle the error gracefully in the UI
      throw new Error("API Key is missing in environment variables");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

const generateSystemInstruction = (project?: Project) => {
    const base = `You are a highly intelligent Research Assistant. 
    Your goal is to help a scientific researcher manage their projects, clarify complex concepts, suggest methodologies, and refine academic writing. 
    Be concise, precise, and academic in tone unless asked otherwise.`;

    if (!project) return base;

    // Serialize Project Context
    const taskList = project.tasks.map(t => `- ${t.title} (${t.status}, due ${t.dueDate})`).join('\n');
    const paperList = project.papers.map(p => `- ${p.title} (${p.status})`).join('\n');
    const fileList = project.files.map(f => `- ${f.name} (${f.type})`).join('\n');

    return `${base}
    
    CURRENT PROJECT CONTEXT:
    Title: ${project.title}
    Description: ${project.description}
    Status: ${project.status}
    Progress: ${project.progress}%
    
    TASKS:
    ${taskList}
    
    PAPERS:
    ${paperList}
    
    FILES:
    ${fileList}
    
    You have access to the metadata of the project above. Use it to answer questions about deadlines, resources, and progress specific to this project.`;
};

/**
 * Sends a message to the Gemini chatbot.
 * Uses gemini-3-pro-preview for complex reasoning and conversation.
 */
export const sendChatMessage = async (
  history: { role: 'user' | 'model'; text: string }[],
  newMessage: string,
  project?: Project
): Promise<string> => {
  try {
    const ai = getGenAI();
    const chat: Chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: generateSystemInstruction(project),
      },
      history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Error: Unable to connect to AI. Please check if your API Key is configured in Vercel settings.";
  }
};

/**
 * Expands a research idea into a structured proposal or set of questions.
 * Uses gemini-2.5-flash for speed.
 */
export const expandResearchIdea = async (ideaTitle: string, currentContent: string): Promise<string> => {
  try {
    const ai = getGenAI();
    const prompt = `
      I am a researcher. I have a rough idea: "${ideaTitle}".
      My current notes are: "${currentContent}".
      
      Please expand this into a brief research outline including:
      1. Potential Research Question
      2. Key Hypotheses
      3. Suggested Methodology
      4. 3 Keywords for Literature Search
      
      Return as Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not expand idea.";
  } catch (error) {
    console.error("Gemini Idea Expansion Error:", error);
    throw error;
  }
};

/**
 * Summarizes a scientific abstract or text snippet.
 * Uses gemini-2.5-flash.
 */
export const summarizeText = async (text: string): Promise<string> => {
  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize the following scientific text in 3 concise bullet points:\n\n${text}`,
    });

    return response.text || "No summary available.";
  } catch (error) {
    console.error("Gemini Summarize Error:", error);
    return "Error generating summary.";
  }
};

/**
 * Suggests a schedule/reminders for a project.
 * Uses gemini-3-pro-preview for reasoning.
 */
export const suggestProjectSchedule = async (projectTitle: string, status: string): Promise<{ title: string; daysFromNow: number; type: 'task' | 'deadline' }[]> => {
    try {
        const ai = getGenAI();
        const prompt = `
        I have a research project titled "${projectTitle}" which is currently in the "${status}" phase.
        Suggest 3 key milestones or tasks I should set as reminders for the next 2 weeks.
        
        Return the result STRICTLY as a JSON array of objects with these properties:
        - "title": string (The task name)
        - "daysFromNow": number (How many days from today, between 1 and 14)
        - "type": string (One of: "task", "deadline", "meeting")
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Schedule Error:", error);
        return [];
    }
}

/**
 * Generates a detailed project outline including milestones and research questions.
 * Uses gemini-3-pro-preview.
 */
export const generateProjectDetails = async (title: string, description: string): Promise<{ tasks: {title: string, priority: string, daysFromNow: number}[], questions: string[] }> => {
    try {
        const ai = getGenAI();
        const prompt = `
        I am starting a new scientific research project.
        Title: "${title}"
        Description: "${description}"
        
        Please act as a senior research principal and generate:
        1. 4-6 Key Milestones/Tasks to get started (e.g. Literature Review, Data Collection) with suggested priorities (high/medium/low) and realistic timelines relative to today.
        2. 3 Critical Research Questions that this project should answer.
        
        Return STRICTLY JSON format:
        {
            "tasks": [
                { "title": "Task Name", "priority": "high", "daysFromNow": 5 }
            ],
            "questions": [ "Question 1", "Question 2" ]
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Project Gen Error:", error);
        // Fallback
        return { 
            tasks: [{ title: "Initial Literature Review", priority: "high", daysFromNow: 3 }], 
            questions: ["What is the primary impact of this research?"] 
        };
    }
}