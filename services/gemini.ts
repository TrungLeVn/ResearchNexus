import { GoogleGenAI, Chat } from "@google/genai";
import { Project, Idea, Reminder, Course, PersonalGoal, Habit, JournalEntry, AcademicYearDoc } from "../types";

// Singleton instance variable
let aiInstance: GoogleGenAI | null = null;

// Lazy initialization function
const getGenAI = (): GoogleGenAI => {
  if (!aiInstance) {
    // Access process.env directly as polyfilled by vite.config.ts
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY is missing. Please set it in Vercel Environment Variables.");
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

// NEW: Module-specific System Instructions
const generateModuleSystemInstruction = (type: string, data: any) => {
    const base = `You are "TrungLe's Corner AI". You are currently assisting in the **${type.toUpperCase()}** module.`;

    if (type === 'teaching') {
        const courses = data as Course[];
        const courseList = courses.map(c => 
            `- ${c.code}: ${c.name} (${c.studentsCount} students). Schedule: ${c.scheduleDay} at ${c.scheduleTime}, Room ${c.room}. Archived: ${c.isArchived}`
        ).join('\n');
        
        return `${base}
        You have access to the following teaching courses:
        ${courseList}
        
        Help the professor manage schedules, suggest teaching materials, draft syllabus updates, or plan lectures based on this data.`;
    }

    if (type === 'personal') {
        const { goals, habits } = data as { goals: PersonalGoal[], habits: Habit[] };
        const goalsList = goals.map(g => 
            `- Goal: ${g.title} (${g.category}). Target: ${g.target}. Progress: ${g.progress}%. Milestones: ${g.milestones.filter(m=>m.completed).length}/${g.milestones.length} done.`
        ).join('\n');
        const habitsList = habits.map(h => `- Habit: ${h.title}. Current Streak: ${h.streak} days.`).join('\n');

        return `${base}
        You are a Personal Growth Coach.
        
        CURRENT GOALS:
        ${goalsList}
        
        HABIT TRACKER:
        ${habitsList}
        
        Encourage the user, suggest actionable next steps for their goals, and help them analyze their habit streaks.`;
    }

    if (type === 'journal') {
        const entries = data as JournalEntry[];
        // Only take the last 7 entries to avoid context limit
        const recentEntries = entries.slice(0, 7).map(e => {
            let notesText = "";
            if (e.notes && e.notes.length > 0) {
                notesText = e.notes.map(n => `[${n.title}] ${n.content}`).join('; ');
            } else {
                notesText = e.content.substring(0, 200);
            }

            return `Date: ${e.date}
            Tasks: ${e.tasks.filter(t=>t.done).length}/${e.tasks.length} completed.
            Notes: ${notesText}...`
        }).join('\n---\n');

        return `${base}
        You are a reflective journaling companion.
        
        RECENT ENTRIES:
        ${recentEntries}
        
        Help the user reflect on their days, summarize their recent progress, and suggest improvements for tomorrow's daily plan.`;
    }

    if (type === 'admin') {
        const { docs, projects } = data as { docs: AcademicYearDoc[], projects: Project[] };
        const docList = docs.map(d => `- [${d.year}] ${d.name} (${d.category})`).join('\n');
        const projectList = projects.map(p => `- ${p.title} (${p.status})`).join('\n');

        return `${base}
        You are an Administrative Secretary.
        
        DOCUMENTS & RECORDS:
        ${docList}
        
        ADMIN PROJECTS:
        ${projectList}
        
        Help locate documents, summarize administrative workload, and suggest organization strategies.`;
    }

    return base;
};

// Global System Instruction
export const generateGlobalSystemInstruction = (
    projects: Project[],
    ideas: Idea[],
    reminders: Reminder[]
) => {
    const researchProjects = projects.filter(p => !p.category || p.category === 'research');
    const adminProjects = projects.filter(p => p.category === 'admin');

    return `You are "TrungLe's Corner AI", the central intelligence for Assoc.Prof. Trung Le's entire academic life.
    You have access to ALL data across Research, Teaching, Admin, and Personal Growth.
    
    OVERVIEW OF DATA:
    
    1. RESEARCH PROJECTS:
    ${researchProjects.map(p => `- ${p.title} (${p.status}, ${p.progress}%)`).join('\n')}
    
    2. ADMIN PROJECTS:
    ${adminProjects.map(p => `- ${p.title} (${p.status})`).join('\n')}
    
    3. IDEA LAB:
    ${ideas.map(i => `- ${i.title}`).join('\n')}
    
    4. UPCOMING REMINDERS:
    ${reminders.slice(0, 10).map(r => `- ${r.title} (${r.date.toDateString()})`).join('\n')}
    
    ROLE:
    - Act as a Chief of Staff.
    - Connect dots between research, teaching, and admin duties.
    - If asked "What should I do today?", analyze deadlines from all categories.
    - Be proactive, encouraging, but highly organized.
    `;
};

/**
 * Sends a message to the Gemini chatbot.
 */
export const sendChatMessage = async (
  history: { role: 'user' | 'model'; text: string }[],
  newMessage: string,
  project?: Project,
  globalContext?: { projects: Project[], ideas: Idea[], reminders: Reminder[] },
  moduleContext?: { type: 'teaching' | 'personal' | 'journal' | 'admin', data: any }
): Promise<string> => {
  try {
    const ai = getGenAI();
    
    let systemInstruction = "";
    if (globalContext) {
        systemInstruction = generateGlobalSystemInstruction(globalContext.projects, globalContext.ideas, globalContext.reminders);
    } else if (moduleContext) {
        systemInstruction = generateModuleSystemInstruction(moduleContext.type, moduleContext.data);
    } else {
        systemInstruction = generateSystemInstruction(project);
    }

    const chat: Chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: systemInstruction,
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
 * Summarizes and Structures messy idea notes.
 */
export const structureIdeaContent = async (content: string): Promise<string> => {
  try {
    const ai = getGenAI();
    const prompt = `
      The following is a raw brain dump of a research idea. 
      Please restructure it into a clean, readable Markdown format with these sections if applicable:
      - **Core Concept** (1-2 sentences)
      - **Key Objectives** (Bulleted list)
      - **Notes & Thoughts** (Cleaned up text)
      
      RAW CONTENT:
      ${content}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || content;
  } catch (error) {
    console.error("Gemini Structure Error:", error);
    return content;
  }
};

/**
 * Brainstorms related topics for an idea.
 */
export const brainstormRelatedTopics = async (title: string, content: string): Promise<string[]> => {
  try {
    const ai = getGenAI();
    const prompt = `
      Based on this research idea:
      Title: "${title}"
      Context: "${content.substring(0, 500)}"
      
      Suggest 5 related research topics, fields, or keywords that I should explore to broaden my brainstorming.
      Return STRICTLY as a JSON array of strings.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini Brainstorm Error:", error);
    return [];
  }
};

/**
 * Summarizes a scientific abstract or text snippet.
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

// --- SMART PLAN FUNCTIONS ---

/**
 * Suggests a schedule/reminders for a PROJECT.
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
 * Suggests tasks for TEACHING.
 */
export const suggestTeachingPlan = async (currentCourses: string[]): Promise<{ title: string; daysFromNow: number; type: 'task' | 'deadline' }[]> => {
    try {
        const ai = getGenAI();
        const prompt = `
        I am a professor teaching these courses: ${currentCourses.join(', ')}.
        It is currently the middle of the semester.
        Suggest 3 administrative or teaching tasks I should not forget (e.g. grading, preparing next lecture, office hours).
        
        Return STRICTLY as JSON array:
        [{ "title": "string", "daysFromNow": number, "type": "task" }]
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '[]');
    } catch (error) { return []; }
}

/**
 * Suggests tasks for ADMIN work.
 */
export const suggestAdminPlan = async (): Promise<{ title: string; daysFromNow: number; type: 'task' | 'deadline' }[]> => {
    try {
        const ai = getGenAI();
        const prompt = `
        I have administrative duties as an Associate Professor.
        Suggest 3 generic but critical admin tasks (e.g. check department emails, sign forms, review committee notes).
        
        Return STRICTLY as JSON array:
        [{ "title": "string", "daysFromNow": number, "type": "task" }]
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '[]');
    } catch (error) { return []; }
}

/**
 * Suggests tasks for PERSONAL GROWTH.
 */
export const suggestPersonalPlan = async (goals: string[]): Promise<{ title: string; daysFromNow: number; type: 'task' | 'deadline' }[]> => {
    try {
        const ai = getGenAI();
        const prompt = `
        My personal goals are: ${goals.join(', ')}.
        Suggest 3 small, actionable steps I can take this week to make progress.
        
        Return STRICTLY as JSON array:
        [{ "title": "string", "daysFromNow": number, "type": "task" }]
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '[]');
    } catch (error) { return []; }
}

/**
 * Generates specific milestones for a single personal goal.
 */
export const generateGoalMilestones = async (goal: string, target: string): Promise<string[]> => {
    try {
        const ai = getGenAI();
        const prompt = `
        I want to achieve the following personal goal: "${goal}".
        My specific target/metric is: "${target}".
        
        Please generate 5-7 concrete, actionable milestones or steps to achieve this.
        
        Return STRICTLY as a JSON array of strings.
        Example: ["Buy running shoes", "Run 5km without stopping", "Register for race"]
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '[]');
    } catch (error) { 
        console.error("Gemini Goal Plan Error:", error);
        return ["Define start date", "Track first week progress", "Review mid-term results"]; 
    }
}

/**
 * Suggests tasks for DAILY JOURNAL.
 */
export const suggestJournalPlan = async (date: string): Promise<{ text: string, done: boolean }[]> => {
    try {
        const ai = getGenAI();
        const prompt = `
        It is ${date}. Generate a productive daily checklist for an academic.
        Include 1 research task, 1 teaching task, 1 health task.
        
        Return STRICTLY as JSON array:
        [{ "text": "string", "done": false }]
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '[]');
    } catch (error) { return []; }
}

/**
 * Generates tasks from a user description for DAILY JOURNAL.
 */
export const generateDailyTasksFromDescription = async (description: string, date: string): Promise<{ text: string, done: boolean }[]> => {
    try {
        const ai = getGenAI();
        const prompt = `
        It is ${date}. The user has described their daily focus as: "${description}".
        
        Break this down into 3-6 specific, actionable checklist items (checkpoints).
        Return STRICTLY as a JSON array of objects:
        [{ "text": "string", "done": false }]
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '[]');
    } catch (error) { 
        console.error("Gemini Daily Task Gen Error:", error);
        return []; 
    }
}

/**
 * Generates a detailed project outline.
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
        return { 
            tasks: [{ title: "Initial Literature Review", priority: "high", daysFromNow: 3 }], 
            questions: ["What is the primary impact of this research?"] 
        };
    }
}

/**
 * Generates a representative cover image for a course.
 */
export const generateCourseImage = async (courseName: string): Promise<string | null> => {
    try {
        const ai = getGenAI();
        const prompt = `Create a flat, modern, minimalist academic illustration for a university course titled "${courseName}". 
        Use a clean vector art style with soothing colors suitable for a dashboard. Do not include text in the image.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                 imageConfig: { aspectRatio: "16:9" }
            }
        });

        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Gemini Image Gen Error:", error);
        return null;
    }
};

/**
 * Generates a daily briefing for a project.
 */
export const generateProjectBriefing = async (project: Project): Promise<string> => {
    try {
        const ai = getGenAI();
        
        const taskSummary = project.tasks.map(t => `- ${t.title} (Status: ${t.status}, Due: ${t.dueDate})`).join('\n');
        const activitySummary = (project.activity || []).slice(0, 5).map(a => `- ${a.message} (${new Date(a.timestamp).toLocaleDateString()})`).join('\n');

        const prompt = `
        Act as an expert project manager. Here is the current data for a research project:
        
        **Title:** ${project.title}
        **Description:** ${project.description}
        **Status:** ${project.status}
        **Progress:** ${project.progress}%
        
        **Tasks:**
        ${taskSummary}
        
        **Recent Activity (last 5):**
        ${activitySummary}
        
        Please provide a concise, actionable "Daily Briefing" in Markdown. Your briefing should:
        1.  Start with a one-sentence summary of the project's current state.
        2.  Identify the top 1-3 immediate priorities. Mention any overdue tasks specifically.
        3.  Give a heads-up on any upcoming deadlines in the next week.
        4.  Conclude with a brief, encouraging summary.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
        });

        return response.text || "Could not generate project briefing.";
    } catch (error) {
        console.error("Gemini Project Briefing Error:", error);
        return "Error: Could not connect to AI to generate briefing.";
    }
};