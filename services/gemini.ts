import { GoogleGenAI, Chat } from "@google/genai";
import { Project } from "../types";

// Initialize Gemini Client
// Ensure your Vercel project has the environment variable API_KEY set.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    throw new Error("Failed to communicate with AI Assistant.");
  }
};

/**
 * Expands a research idea into a structured proposal or set of questions.
 * Uses gemini-2.5-flash for speed.
 */
export const expandResearchIdea = async (ideaTitle: string, currentContent: string): Promise<string> => {
  try {
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