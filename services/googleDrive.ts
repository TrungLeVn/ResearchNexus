export interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
}

const getApiKey = (): string => {
    const apiKey = process.env.API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing for Google Drive API. Please set it in Vercel and ensure the Google Drive API is enabled in your Google Cloud project.");
    }
    return apiKey;
};

const getFolderIdFromUrl = (url: string): string | null => {
    const regex = /folders\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

export const listFilesInFolder = async (folderUrl: string): Promise<DriveFile[]> => {
    const folderId = getFolderIdFromUrl(folderUrl);
    if (!folderId) {
        throw new Error("Invalid Google Drive folder URL. Please provide a valid folder link.");
    }

    const apiKey = getApiKey();
    const endpoint = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed = false&key=${apiKey}&fields=files(id,name,webViewLink)&orderBy=name`;
    
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Google Drive API Error:", errorData);
            const message = errorData.error?.message || "Failed to fetch files. Please ensure the folder is public ('Anyone with the link can view').";
            throw new Error(message);
        }
        const data = await response.json();
        return data.files || [];
    } catch (error) {
        console.error("Error fetching from Google Drive:", error);
        if (error instanceof Error) throw error;
        throw new Error("An unknown error occurred while fetching files from Google Drive.");
    }
};
