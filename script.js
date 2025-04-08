let token;
let pdfcontext = ''; 
let pdfSummary = ''; 

let activeTab = 'home';

let chatSessionsDocTalk = [];
let activeChatIdDocTalk = null;

let chatSessionsDataChat = [];
let activeChatIdDataChat = null;

window.onload = async function () {
    try {
        const response = await fetch("https://llmfoundry.straive.com/token", {
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.token) {
            token = data.token;
            console.log("Token retrieved");

            // await extractPdfText("vendor_data_v3.pdf"); 
            // pdfSummary = await generatePdfSummary(pdfcontext); 
            // await generateAndDisplaySuggestedPromptsDocTalk(pdfSummary); 

        } else {
            token = null;
            console.warn("Token not found in response");
            //  generateAndDisplaySuggestedPromptsDocTalk("Default summary: Information about various EDF vendors and their services.");
        }
    } catch (error) {
        token = null;
        alert(`Error fetching token: ${error}`);
        console.error("Error fetching token:", error);
        // generateAndDisplaySuggestedPromptsDocTalk("Error generating summary. Using default summary.");
    }

    startNewChatDocTalk();
    startNewChatDataChat();
    setActiveTab(activeTab); 

};


// General

const conversationList = document.getElementById('conversationList');
const newChatBtn = document.getElementById('newChatBtn');
const dataChatTabButton = document.getElementById('datachat-tab-button');
const docTalkTabButton = document.getElementById('doctalk-tab-button');
const docTalkMain = document.getElementById('doctalk');
const dataChatMain = document.getElementById('datachat');
const homeTabButton = document.getElementById('home-tab-button'); // New button reference
const homeMain = document.getElementById('home'); // Home main area reference

const recentConversationsNav = document.querySelector('.recent-conversations');

// DocTalk Specific
const chatLogDocTalk = document.getElementById('chatLogDocTalk');
const userInputDocTalk = document.getElementById('userInputDocTalk');
const sendButtonDocTalk = document.getElementById('sendButtonDocTalk');
const suggestedPromptsDocTalk = document.getElementById('suggestedPromptsDocTalk');
const chatHeaderTitleDocTalk = document.getElementById('chatHeaderTitleDocTalk');
const fileAttachDocTalk = document.getElementById('file-attachDocTalk');
const fileInputDocTalk = document.getElementById('fileInputDocTalk');

// DataChat Specific
const chatLogDataChat = document.getElementById('chatLogDataChat');
const userInputDataChat = document.getElementById('userInputDataChat');
const sendButtonDataChat = document.getElementById('sendButtonDataChat');
const suggestedPromptsDataChat = document.getElementById('suggestedPromptsDataChat');
const chatHeaderTitleDataChat = document.getElementById('chatHeaderTitleDataChat');
const fileAttachDataChat = document.getElementById('file-attachDataChat'); // Add if needed
const fileInputDataChat = document.getElementById('fileInputDataChat'); // Add if needed


// --- Tab Switching Logic ---
dataChatTabButton.addEventListener('click', () => setActiveTab('datachat'));
docTalkTabButton.addEventListener('click', () => setActiveTab('doctalk'));
homeTabButton.addEventListener('click', () => setActiveTab('home')); // Listener for home button


const dataFileList = document.getElementById('dataFileList');
const docFileList = document.getElementById('docFileList');


import sqlite3InitModule from "https://esm.sh/@sqlite.org/sqlite-wasm@3.46.1-build3";
import { dsvFormat, autoType } from "https://cdn.jsdelivr.net/npm/d3-dsv@3/+esm";


// Initialize SQLite (Keep this at the top, outside any function)
const defaultDB = "@";
const sqlite3 = await sqlite3InitModule({ printErr: console.error });
const db = new sqlite3.oo1.DB(defaultDB, "c"); // Initialize db here, globally accessible
const DB = { // Keep DB object globally accessible
    context: "",
    schema: function () {
        let tables = [];
        db.exec("SELECT name, sql FROM sqlite_master WHERE type='table'", { rowMode: "object" }).forEach((table) => {
            table.columns = db.exec(`PRAGMA table_info(${table.name})`, { rowMode: "object" });
            tables.push(table);
        });
        return tables;
    },
    
    upload: async function (file) {
        if (file.name.match(/\.(sqlite3|sqlite|db|s3db|sl3)$/i)) await DB.uploadSQLite(file);
        else if (file.name.match(/\.csv$/i)) await DB.uploadDSV(file, ",");
        else if (file.name.match(/\.tsv$/i)) await DB.uploadDSV(file, "\t");
    },
    uploadSQLite: async function (file) {
        const fileReader = new FileReader();
        await new Promise((resolve) => {
            fileReader.onload = async (e) => {
                await sqlite3.capi.sqlite3_js_posix_create_file(file.name, e.target.result);
                const uploadDB = new sqlite3.oo1.DB(file.name, "r");
                const tables = uploadDB.exec("SELECT name, sql FROM sqlite_master WHERE type='table'", { rowMode: "object" });
                for (const { name, sql } of tables) {
                    db.exec(`DROP TABLE IF EXISTS "${name}"`);
                    db.exec(sql);
                    const data = uploadDB.exec(`SELECT * FROM "${name}"`, { rowMode: "object" });
                    if (data.length > 0) {
                        const columns = Object.keys(data[0]);
                        const sql = `INSERT INTO "${name}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
                        const stmt = db.prepare(sql);
                        db.exec("BEGIN TRANSACTION");
                        for (const row of data) stmt.bind(columns.map((c) => row[c])).stepReset();
                        db.exec("COMMIT");
                        stmt.finalize();
                    }
                }
                uploadDB.close();
                resolve();
            };
            fileReader.readAsArrayBuffer(file);
        });
    },
    uploadDSV: async function (file, separator) {
        const fileReader = new FileReader();
        const result = await new Promise((resolve) => {
            fileReader.onload = (e) => {
                const rows = dsvFormat(separator).parse(e.target.result, autoType);
                resolve(rows);
            };
            fileReader.readAsText(file);
        });
        const tableName = file.name.slice(0, -4).replace(/[^a-zA-Z0-9_]/g, "_");
        await DB.insertRows(tableName, result);
    },
    insertRows: async function (tableName, result) {
        const cols = Object.keys(result[0]);
        const typeMap = Object.fromEntries(
            cols.map((col) => {
                const sampleValue = result[0][col];
                let sqlType = "TEXT";
                if (typeof sampleValue === "number") sqlType = Number.isInteger(sampleValue) ? "INTEGER" : "REAL";
                else if (typeof sampleValue === "boolean") sqlType = "INTEGER";
                else if (sampleValue instanceof Date) sqlType = "TEXT";
                return [col, sqlType];
            }),
        );
        const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${cols.map((col) => `[${col}] ${typeMap[col]}`).join(", ")})`;
        db.exec(createTableSQL);
        const insertSQL = `INSERT INTO ${tableName} (${cols.map((col) => `[${col}]`).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
        const stmt = db.prepare(insertSQL);
        db.exec("BEGIN TRANSACTION");
        for (const row of result) {
            stmt
                .bind(
                    cols.map((col) => {
                        const value = row[col];
                        return value instanceof Date ? value.toISOString() : value;
                    }),
                )
                .stepReset();
        }
        db.exec("COMMIT");
        stmt.finalize();
        const schema = DB.schema();
        // console.log(schema);
        generateAndDisplaySuggestedPromptsDataChat("Also Ensure till you don't know the exact row values don't assume anything specific. For Eg:- If a column country is there, then in suggested prompts don't give any country name until it's in the context.",schema);
    },
};



function setActiveTab(tabName) {
    activeTab = tabName;

    // Hide all main areas first
    homeMain.style.display = 'none';
    docTalkMain.style.display = 'none';
    dataChatMain.style.display = 'none';

    // Remove active class from all buttons
    homeTabButton.classList.remove('active-tab-button');
    docTalkTabButton.classList.remove('active-tab-button');
    dataChatTabButton.classList.remove('active-tab-button');

    // Hide recent conversations by default, show only for chat tabs
    recentConversationsNav.style.display = 'none';

    if (tabName === 'home') {
        homeMain.style.display = 'flex'; // Show home area
        homeTabButton.classList.add('active-tab-button');
        // Keep recent conversations hidden (already done above)
        renderSidebar(); // Render sidebar (will be empty for 'home')

    } else if (tabName === 'doctalk') {
        docTalkMain.style.display = 'flex'; // Show DocTalk area
        docTalkTabButton.classList.add('active-tab-button');
        recentConversationsNav.style.display = 'block'; // Show recent conversations
        renderSidebar(); // Render DocTalk conversations
        if (activeChatIdDocTalk) {
            // setActiveChatDocTalk(activeChatIdDocTalk); // Re-activating might re-render log, maybe not needed unless switching *back*
            let id;
        } else {
            startNewChatDocTalk(); // Should already exist, but ensures one is active
        }
        userInputDocTalk.focus();

    } else if (tabName === 'datachat') {
        dataChatMain.style.display = 'flex'; // Show DataChat area
        dataChatTabButton.classList.add('active-tab-button');
        recentConversationsNav.style.display = 'block'; // Show recent conversations
        renderSidebar(); // Render DataChat conversations
        if (activeChatIdDataChat) {
            // setActiveChatDataChat(activeChatIdDataChat); // Similar to DocTalk, maybe not needed on switch
            //  console.log("Switched to DataChat tab");
            let id;
        } else {
            startNewChatDataChat(); // Ensure one is active
        }
        userInputDataChat.focus();
    }
}



async function extractPdfText(pdfUrl) {
    pdfcontext = '';
    try {
        if (typeof pdfjsLib === 'undefined') {
            console.error("pdf.js library is not loaded.");
            return;
        }
         if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
        }

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        pdfcontext += fullText; 
        // console.log("Extracted PDF Text for DocTalk");

    } catch (error) {
        console.error("Error extracting PDF text:", error);
        pdfcontext = "Error loading document context."; 
    }
}

fileAttachDocTalk.addEventListener('click', () => {
    fileInputDocTalk.click();
});


// fileInputDocTalk.addEventListener('change', async (event) => {
//     const files = event.target.files;

//     if (files.length === 0) return;

//     // Clear the list first
//     // docFileList.innerHTML = '';

//     for (let i = 0; i < files.length; i++) {
//         const file = files[i];
//         const fileType = file.name.split('.').pop().toLowerCase();

//         const listItem = document.createElement('div');
//         listItem.textContent = `• ${file.name}`;
//         docFileList.appendChild(listItem);

//         await extractTextFromFile(fileType, file, file.name, 'doctalk');
//     }

//     await generateAndDisplaySuggestedPromptsDocTalk(pdfSummary);
//     docFileList.style.display = "block";
//     fileInputDocTalk.value = '';
// });
fileInputDocTalk.addEventListener('change', async (event) => {
    const files = event.target.files;
    if (files.length === 0) return;

    // Show the file list container and "Processing..." message
    docFileList.style.display = "block";
    document.getElementById('processing-div-doctalk').style.display = "block";

    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = file.name.split('.').pop().toLowerCase();

        const listItem = document.createElement('div');
        listItem.textContent = `• ${file.name}`;
        docFileList.appendChild(listItem);

        await extractTextFromFile(fileType, file, file.name, 'doctalk');
    }

    await generateAndDisplaySuggestedPromptsDocTalk(pdfSummary);

    document.getElementById('processing-div-doctalk').style.display = "none";
    fileInputDocTalk.value = '';
});



fileAttachDataChat.addEventListener('click', () => {
    fileInputDataChat.click();
});



// fileInputDataChat.addEventListener('change', async (e) => {
//     const files = e.target.files;

//     // Clear the list first
//     // dataFileList.innerHTML = '';

//     const uploadPromises = Array.from(files).map((file) => {
//         const listItem = document.createElement('div');
//         listItem.textContent = `• ${file.name}`;
//         dataFileList.appendChild(listItem);
//         return DB.upload(file);
//     });

//     await Promise.all(uploadPromises);
//     dataFileList.style.display="block";
// });

fileInputDataChat.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files.length === 0) return;

    // Show the file list container and "Processing..." message
    dataFileList.style.display = "block";
    document.getElementById('processing-div-datachat').style.display = "block";

    const uploadPromises = Array.from(files).map((file) => {
        const listItem = document.createElement('div');
        listItem.textContent = `• ${file.name}`;
        dataFileList.appendChild(listItem);
        return DB.upload(file); // Your custom upload logic
    });

    await Promise.all(uploadPromises);

    document.getElementById('processing-div-datachat').style.display = "none";
});



async function extractTextFromFile(fileType, fileData, fileName, targetContext) {
    let extractedContext = '';

    try {
        if (fileType === 'pdf') {
            extractedContext += await extractTextFromPDF(fileData);
        } else if (fileType === 'doc' || fileType === 'docx') {
            extractedContext += await extractTextFromWord(fileData);
        } else if (fileType === 'xls' || fileType === 'xlsx') {
            extractedContext += await extractTextFromExcel(fileData);
        }else if (fileType === 'txt') {
            extractedContext += await extractTextFromTxt(fileData);
        }

        if (targetContext === 'doctalk') {
            pdfcontext += "\n\n--- Appended Context from " + fileName + " ---\n" + extractedContext;
            console.log(`Added context from ${fileName} to DocTalk.`);
            pdfSummary = await generatePdfSummary(pdfcontext);
        } else if (targetContext === 'datachat') {
            console.log(`Extracted text from ${fileName} for DataChat (context handling not implemented yet).`);

        }

        
    } catch (error) {
        console.error(`Error extracting text from ${fileName}:`, error);
    }

    // Remove the pop-up after a short delay
    
}


async function extractTextFromTxt(fileData) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result); // Return the file content as a string
        };
        reader.onerror = reject;
        reader.readAsText(fileData); // Read the file as text
    });
}


async function extractTextFromPDF(fileData) {
    try {
        if (typeof pdfjsLib === 'undefined') {
            console.error("pdf.js library is not loaded.");
            return "Error: PDF library not loaded.";
        }
         if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
        }
        const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
        const pdf = await pdfjsLib.getDocument(pdfBytes).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(" ");
        }
        return text;
    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        return "";
    }
}

async function extractTextFromWord(fileData) {
    try {
        const arrayBuffer = await fileData.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        return result.value;
    } catch (error) {
        console.error("Error extracting text from Word:", error);
        return "";
    }
}

async function extractTextFromExcel(fileData) {
    try {
        const arrayBuffer = await fileData.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let text = "";
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            text += XLSX.utils.sheet_to_csv(sheet, { header: 1 }) + "\n";
        });
        return text;
    } catch (error) {
        console.error("Error extracting text from Excel:", error);
        return "";
    }
}



async function generatePdfSummary(context) {
    if (!token) {
        console.warn("Token is not available. Returning default summary.");
        return "Default summary: Information about various EDF vendors and their services.";
    }
    
    const summaryPrompt = `Summarize the following text about EDF vendors in approximately 150 words. Focus on the key topics and entities mentioned. Do not include any introductory or concluding remarks.\n\nContext:\n${context}`;

    try {
        const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}:EDF-Vendors` 
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: summaryPrompt }],
            }),
        });

        if (!response.ok) {  throw new Error(`API request failed: ${response.statusText}`); }
        const data = await response.json();
        if (data.choices && data.choices[0].message) {
            return data.choices[0].message.content.trim();
        } else { throw new Error("Unexpected API response structure."); }
    } catch (error) {
        console.error("Error generating PDF summary:", error);
        return "Error generating summary.";
    }
}

async function generateAndDisplaySuggestedPromptsDocTalk(context) {
    if (!suggestedPromptsDocTalk) {
        console.error("suggestedPromptsDocTalk container not found.");
        return;
    }
    try {
        const prompts = await getSuggestedPrompts(context, 'doctalk'); 
        suggestedPromptsDocTalk.innerHTML = '';
        prompts.forEach(prompt => {
            const button = document.createElement('button');
            button.classList.add('prompt-btn');
            button.textContent = prompt;

            button.addEventListener('click', () => {
                userInputDocTalk.value = prompt;
                handleSendMessageDocTalk(); 
            });
            suggestedPromptsDocTalk.appendChild(button);
        });
    } catch (error) {
        console.error("Error generating/displaying DocTalk prompts:", error);
        suggestedPromptsDocTalk.innerHTML = '<p>Failed to load suggested prompts.</p>';
    }
}

async function generateAndDisplaySuggestedPromptsDataChat(context,schema=[]) {
     if (!suggestedPromptsDataChat) {
        console.error("suggestedPromptsDataChat container not found.");
        return;
    }
    try {
        const prompts = await getSuggestedPrompts(context, 'datachat',schema); 
        suggestedPromptsDataChat.innerHTML = ''; 
        prompts.forEach(prompt => {
            const button = document.createElement('button');
            button.classList.add('prompt-btn'); 
            button.textContent = prompt;
            button.addEventListener('click', () => {
                userInputDataChat.value = prompt;
                handleSendMessageDataChat(); 
            });
            suggestedPromptsDataChat.appendChild(button);
        });
    } catch (error) {
        console.error("Error generating/displaying DataChat prompts:", error);
        suggestedPromptsDataChat.innerHTML = '<p>Failed to load suggested prompts.</p>';
    }
}


async function getSuggestedPrompts(context, type = 'doctalk',schema=[]) {
     const defaultPromptsDocTalk = [
        "List out all vendors manufacturing valves",
        "Give all details about vendors in city Mumbai",
        "Vendors who provides Radiation Shielding"
    ];
     const defaultPromptsDataChat = [
        "How many vendors are in the database?",
        "Show vendors located in 'Paris'.",
        "What product categories exist?"
    ];

    if (!token) {
        console.warn("Token not available. Returning default prompts.");
        return type === 'datachat' ? defaultPromptsDataChat : defaultPromptsDocTalk;
    }

    let promptGenerationPrompt;
    if (type === 'datachat') {
        promptGenerationPrompt = `Given the following summary or description of a vendor database: "${context}" with the schema "${JSON.stringify(schema)}", generate three distinct and useful question prompts a user might ask about the structured data. Prompts should be specific, actionable, less than 80 characters, and suitable for querying a database (e.g., filtering, counting, listing categories). Do not include numbering or bullet points, just the three prompts on new lines.`;
    } else { 
        promptGenerationPrompt = `Given the following summary about EDF vendors from documents: "${context}", generate three distinct and useful question prompts that a user might ask. The prompts should be specific and actionable, encouraging the user to explore the document content. Do not include any introductory or concluding remarks, just the three prompts, each on a new line. Do not include any numbering or bullet points. Don't write any mathematical prompt and should be something that can be answered appropriately from context. The prompts should be less than 80 characters each.`;
    }


    try {
        
        const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}:EDF-Vendors` 
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: promptGenerationPrompt }],
            }),
        });

        if (!response.ok) {  throw new Error(`API request failed: ${response.statusText}`); }
        const data = await response.json();
        if (data.choices && data.choices[0].message) {
            const content = data.choices[0].message.content;
            const prompts = content.trim().split('\n').map(prompt => prompt.trim()).filter(p => p); 
            return prompts.length > 0 ? prompts : (type === 'datachat' ? defaultPromptsDataChat : defaultPromptsDocTalk); 
        } else {  throw new Error("Unexpected API response structure."); }
    } catch (error) {
        console.error(`Error generating suggested prompts for ${type}:`, error);
        return type === 'datachat' ? defaultPromptsDataChat : defaultPromptsDocTalk; 
    }
}


// --- Core Chat Logic ---

sendButtonDocTalk.addEventListener('click', handleSendMessageDocTalk);
userInputDocTalk.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessageDocTalk();
    }
});


sendButtonDataChat.addEventListener('click', handleSendMessageDataChat);
userInputDataChat.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessageDataChat();
    }
});

newChatBtn.addEventListener('click', () => {
    if (activeTab === 'doctalk') {
        startNewChatDocTalk();
    } else if (activeTab === 'datachat') { 
        startNewChatDataChat();
    }
});


conversationList.addEventListener('click', (event) => {
    // This list is only visible when activeTab is 'doctalk' or 'datachat'
    if (event.target.classList.contains('conversation-btn')) {
       const chatId = event.target.dataset.chat;
       if (activeTab === 'doctalk' && chatId && chatId !== activeChatIdDocTalk) {
           setActiveChatDocTalk(chatId);
       } else if (activeTab === 'datachat' && chatId && chatId !== activeChatIdDataChat) {
           setActiveChatDataChat(chatId);
       }
   }
});


function generateChatId() {
    return `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// --- DocTalk Specific Chat Functions ---
function startNewChatDocTalk() {
    const newChatId = generateChatId();
    const newChat = {
        id: newChatId,
        title: "DocTalk Session", // Default title
        messages: [
            { role: "assistant", content: "Hello! How can I assist you with vendor documents today?" }
        ]
    };
    chatSessionsDocTalk.push(newChat);
    setActiveChatDocTalk(newChatId);
    console.log("Started new DocTalk chat:", newChatId);
}

function setActiveChatDocTalk(chatId) {
    activeChatIdDocTalk = chatId;
    renderChatLogDocTalk();
    renderSidebar(); // Update sidebar highlighting
    userInputDocTalk.value = '';
    userInputDocTalk.focus();
}

async function handleSendMessageDocTalk() {
    const userText = userInputDocTalk.value.trim();
    if (userText === '' || !activeChatIdDocTalk) return;

    const activeChat = chatSessionsDocTalk.find(chat => chat.id === activeChatIdDocTalk);
    if (!activeChat) return;

    const userMessage = { role: "user", content: userText };
    activeChat.messages.push(userMessage);
    addMessageToDOM('Suresh N.', userText, 'user', chatLogDocTalk); // Pass target log
    userInputDocTalk.value = '';

     const userMessages = activeChat.messages.filter(m => m.role === 'user');
     const assistantMessages = activeChat.messages.filter(m => m.role === 'assistant');
     if (userMessages.length > 5) {
         activeChat.messages = [
             ...assistantMessages, // Keep all assistant messages for now
             ...userMessages.slice(-5) // Keep last 5 user messages
         ].sort((a, b) => /* Need timestamp or order preservation logic if mixing */ 0); // Basic reassembly - needs improvement if order matters strictly
     }


    if (activeChat.messages.filter(m => m.role === 'user').length === 1 && activeChat.title === "DocTalk Session") {
         activeChat.title = "Doc: " + userText.substring(0, 25) + (userText.length > 25 ? '...' : '');
        renderSidebar();
    }

    addMessageToDOM('EDF Intelligence', 'Thinking...', 'ai', chatLogDocTalk, true); // Pass target log

    // *** Crucial: Use pdfcontext for DocTalk ***
    const systemMessage = {
        role: "system",
        content: `You are a helpful assistant specializing in EDF vendor intelligence based *only* on provided documents. Base your answers *strictly* on the following context extracted from vendor documents:\n\n---\n${pdfcontext}\n---\n\nIf the information is not in the context, clearly state that the information is not available in the provided documents. Do not invent information. If responding in a table is appropriate, format your response as a markdown table.`
    };

    const messagesForApi = [systemMessage, ...activeChat.messages.map(({ role, content }) => ({ role, content }))];

    try {
        const aiResponseContent = await getAIResponse(messagesForApi, 'doctalk'); // Pass type if API needs differentiation

        removeThinkingMessage(chatLogDocTalk); // Pass target log

        const aiMessage = { role: "assistant", content: aiResponseContent };
        const aiHtmlResponse = marked.parse(aiResponseContent); // Use marked here
        activeChat.messages.push(aiMessage);
        addMessageToDOM('EDF Intelligence', aiHtmlResponse, 'ai', chatLogDocTalk); // Pass target log

        // Generate new suggested prompts based on the latest interaction for DocTalk
        const combinedContext = `User's Previous Query: ${userText}\n\n AI Response to User's Query: ${aiResponseContent}\n\n Summary of the document context: ${pdfSummary}`;
        await generateAndDisplaySuggestedPromptsDocTalk(combinedContext);


    } catch (error) {
        console.error("Error fetching DocTalk AI response:", error);
        removeThinkingMessage(chatLogDocTalk); // Pass target log
        addMessageToDOM('EDF Intelligence', `Sorry, I encountered an error processing your request about the documents. ${error.message}`, 'ai', chatLogDocTalk, false, true); // Pass target log
    }
}

// --- DataChat Specific Chat Functions ---
function startNewChatDataChat() {
    const newChatId = generateChatId();
    const newChat = {
        id: newChatId,
        title: "DataChat Session", // Default title
        messages: [
            { role: "assistant", content: "Hello! How can I help you query the vendor database today?" }
        ]
    };
    chatSessionsDataChat.push(newChat);
    // Only set active if DataChat is the current view or if it's the very first load
    if (activeTab === 'datachat' || !activeChatIdDataChat) {
         setActiveChatDataChat(newChatId);
    } else {
        renderSidebar(); // Update sidebar even if not active view
    }

    console.log("Started new DataChat chat:", newChatId);
}

function setActiveChatDataChat(chatId) {
    activeChatIdDataChat = chatId;
    renderChatLogDataChat();
    renderSidebar(); // Update sidebar highlighting
    userInputDataChat.value = '';
    // Only focus if the tab is actually visible
    if (activeTab === 'datachat') {
        userInputDataChat.focus();
    }
}



let latestQueryResult=[]; 

async function handleSendMessageDataChat() {
    const userText = userInputDataChat.value.trim();
    if (userText === '' || !activeChatIdDataChat) return;

    const activeChat = chatSessionsDataChat.find(chat => chat.id === activeChatIdDataChat);
    if (!activeChat) return;

    const userMessage = { role: "user", content: userText };
    activeChat.messages.push(userMessage);
    addMessageToDOM('Suresh N.', userText, 'user', chatLogDataChat);
    userInputDataChat.value = '';

    const userMessages = activeChat.messages.filter(m => m.role === 'user');
    const assistantMessages = activeChat.messages.filter(m => m.role === 'assistant');
    if (userMessages.length > 5) {
        activeChat.messages = [
            ...assistantMessages,
            ...userMessages.slice(-5)
        ].sort((a, b) => 0);
    }

    if (activeChat.messages.filter(m => m.role === 'user').length === 1 && activeChat.title === "DataChat Session") {
        activeChat.title = "Data: " + userText.substring(0, 25) + (userText.length > 25 ? '...' : '');
        renderSidebar();
    }

    addMessageToDOM('EDF Intelligence', 'Querying...', 'ai', chatLogDataChat, true);

    try {
        const llmResult = await llmForDataChat({ 
            system: `You are an expert SQLite query writer. The user has a SQLite dataset.

${DB.context}

This is their SQLite schema:

${DB.schema()
                .map(({ sql }) => sql)
                .join("\n\n")}

Answer the user's question following these steps:

1. Guess their objective in asking this.
2. Describe the steps to achieve this objective in SQL.
3. Build the logic for the SQL query by identifying the necessary tables and relationships. Select the only essential columns based on the user's question and the dataset.
5. Write SQL to answer the question. Use SQLite syntax.

Replace generic filter values (e.g. "a location", "specific region", etc.) by querying a random value from data.
Always use [Table].[Column].


Additional Information for columns if vendor Data is there(Else Ignore This Additional Information Below):
-Use the following column definitions(These are details what each field involves) to write SQL queries:

    Company ID: Unique ID of vendor in EDF database.

    Company name: Registered name of the vendor company.

    Country: Country of vendor's main headquarters location.

    State: State/province of vendor's headquarters location.

    Street: Street address of vendor's headquarters.

    Pin code: Postal code of vendor's headquarters address.

    City: City where the vendor is headquartered.

    Factory: Physical location of vendor's manufacturing facility.

    Website: Vendor’s official website URL.

    Company Size: General size classification of the company.

    No. of employees: Total number of vendor’s employees.

    Company Turnover (M€): Annual revenue in million Euros.

    Contact Name: Name of EDF’s point of contact at vendor.

    Contact Title: Job title of contact at the vendor.

    Contact - phone n°: Office phone number of the contact.

    Contact - mobile n°: Mobile number of vendor contact person.

    Contact Email Address: Email address of vendor’s contact person.

    France / Europe Indirect Localisation (Y/N): Y if vendor links with EDF France.

    France / Europe Contact Email Address: Email of EDF contact in France.

    Source: Origin or source of vendor information (e.g., NPCIL).

    Other Source: Additional references who recommended vendor.

    Scope 1: Main product offered by the vendor.

    Scope 2: Secondary product supplied by the vendor.

    Scope 3: Additional product or service from vendor.

    Other Product and/or services family/Comments: Misc. offerings or comments.

    NPCIL Reference: Whether vendor has NPCIL reference or not.

    RFI to be sent (X): X if RFI not yet sent.

    RFI Sent (Date): Date RFI was sent to vendor.

    RFI Receipt (Date): Date RFI response received from vendor.

    RFI Slide receipt date: Date RFI slides were received.

    RCC-M training: Indicates vendor’s RCC-M training status.

    Scoring: RFI response score based on EDF parameters.

    Assessment Performed (Y/V): Y = report available, V = visit done.

    Assessment date: Date of site visit or assessment.

    Report's number: Identifier of the assessment report.

    Level of maturity: Maturity level based on RFI score.

    Product maturity (%): Vendor's product maturity in percentage.

    Organisation maturity (%): Vendor's organizational maturity in percentage.

    Promising supplier (X): X indicates vendor is promising.

    NDA (Yes/_): Yes = NDA signed, blank = not signed.

    MoU (Yes/_): Yes = MoU signed, blank = not signed.

    Approved Vendor List: X = vendor is EDF approved.

    Top 10 supplier (X): X = vendor is in EDF top 10.

For Products you can scope 1, scope 2, scope 3 and Other Product and/or services family/Comments


Note:- Take column names from Schema only(not from Additional Info).
`,
            user: userText,
        });

        removeThinkingMessage(chatLogDataChat);

        const sql = llmResult.match(/```.*?\n(.*?)```/s)?.[1] ?? llmResult;
        let data = [];
        let tableHtmlResponse = '';
        let aiResponseContent = '';

        try {
            data = db.exec(sql, { rowMode: "object" });
            if (data.length > 0) {
                latestQueryResult = data;
                tableHtmlResponse = renderTable(data.slice(0, 100)); 
                aiResponseContent = tableHtmlResponse; 
            } else {
                aiResponseContent = "No results found.";
            }
        } catch (e) {
            aiResponseContent = `<div class="alert alert-danger">${e.message}</div>`;
            console.error("SQL execution error:", e);
        }


        const aiMessage = { role: "assistant", content: aiResponseContent };
        activeChat.messages.push(aiMessage);

        // Use marked.parse to render HTML content in chat, even if it's already HTML from renderTable
        const finalResponseHTML = aiResponseContent;
        addMessageToDOM('EDF Intelligence', finalResponseHTML, 'ai', chatLogDataChat);


        // Generate new suggested prompts based on the latest interaction for DataChat
        const combinedContext = `User's Previous Query: ${userText}\n\n AI Response to User's Query: ${aiResponseContent.startsWith('<table') ? 'Tabular data result' : aiResponseContent}`; // Adjust context based on response type
        await generateAndDisplaySuggestedPromptsDataChat(combinedContext,`${DB.schema().map(({ sql }) => sql).join("\n\n")}`);


    } catch (error) {
        console.error("Error fetching DataChat AI response:", error);
        removeThinkingMessage(chatLogDataChat);
        addMessageToDOM('EDF Intelligence', `Sorry, I encountered an error querying the vendor data. ${error.message}`, 'ai', chatLogDataChat, false, true);
    }
}


async function llmForDataChat({ system, user, schema }) { // Dedicated LLM function for DataChat
    if (!token) {
        console.warn("API Token is not set. Using placeholder response for DataChat.");
        await new Promise(resolve => setTimeout(resolve, 800));
        const query = user?.substring(0, 50) || 'your query';
        return `(Placeholder Response for DataChat) To get a real answer, please set your token in script.js. You asked about: "${query}..."`;
    }

    try {
        const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}:datachat` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: system },
                { role: "user", content: user },
              ],
              temperature: 0,
              ...(schema ? { response_format: { type: "json_schema", json_schema: { name: "response", strict: true, schema } } } : {}),
            }),
          }).then((r) => r.json());

        if (response.error) return response;
        const content = response.choices?.[0]?.message?.content;
        try {
            return schema ? JSON.parse(content) : content;
        } catch (e) {
            return { error: content }; // Return error content if JSON parse fails
        }
    } catch (error) {
        console.error(`Error in llmForDataChat:`, error);
        throw error;
    }
}


// Utility function to render a table (Keep this function as is)
function renderTable(data) {
    if (!data || data.length === 0) return "<p>No data to display.</p>";
    const columns = Object.keys(data[0]);
    return `
    <table class="table table-striped table-hover">
      <thead>
        <tr>
          ${columns.map((col) => `<th>${col}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(
        (row) => `
            <tr>
              ${columns.map((col) => `<td>${row[col] === null || row[col] === undefined ? '' : row[col]}</td>`).join('')}
            </tr>
          `,
    ).join('')}
      </tbody>
    </table>
  `;
}

// --- Generic AI Response Function ---
async function getAIResponse(messages, type = 'doctalk') {
    

    if (!token) { // Use placeholder if token is missing
        console.warn("API Token is not set. Using placeholder response.");
        await new Promise(resolve => setTimeout(resolve, 800));
        const query = messages[messages.length - 1]?.content.substring(0, 50) || 'your query';
        return `(Placeholder Response for ${type}) To get a real answer, please set your token in script.js. You asked about: "${query}..."`;
    }

    try {
        // Use the same endpoint for now, differentiate via system prompt and potentially model
        const modelToUse = (type === 'datachat') ? "gpt-4o-mini" : "gpt-4o-mini"; // Example: maybe use same model
        const tokenSuffix = (type === 'datachat') ? "EDF-Vendors-DB" : "EDF-Vendors-Docs"; // Example: different suffix

        const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}:${tokenSuffix}` // Use type-specific suffix
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: messages,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error Response (${type}):`, errorBody);
            throw new Error(`API request failed (${type}) with status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            console.error(`Unexpected API response structure (${type}):`, data);
            throw new Error(`Received an unexpected response structure from the API (${type}).`);
        }
    } catch (error) {
        console.error(`Error in getAIResponse (${type}):`, error);
        throw error; // Re-throw to be caught by the calling function
    }
}



function addMessageToDOM(sender, text, senderType, targetChatLog, isThinking = false, isError = false) {
    if (!targetChatLog) {
        console.error("Target chat log not provided for addMessageToDOM");
        return;
    }
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${senderType}-message`);
    if (isThinking) messageDiv.classList.add('thinking-message');
    if (isError) messageDiv.classList.add('error-message');

    const senderInfoDiv = document.createElement('div');
    senderInfoDiv.classList.add('message-sender');

    const avatarSpan = document.createElement('span');
    avatarSpan.classList.add('avatar');
    avatarSpan.textContent = sender.substring(0, 2).toUpperCase();
    if (senderType === 'ai') avatarSpan.classList.add('ai-avatar');

    const senderNameSpan = document.createElement('span');
    senderNameSpan.textContent = ` ${sender} `;

    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('timestamp');
    timestampSpan.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    senderInfoDiv.appendChild(avatarSpan);
    senderInfoDiv.appendChild(senderNameSpan);
    senderInfoDiv.appendChild(timestampSpan);

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.innerHTML = text; 

    messageDiv.appendChild(senderInfoDiv);
    messageDiv.appendChild(contentDiv);

    targetChatLog.appendChild(messageDiv);
    targetChatLog.scrollTop = targetChatLog.scrollHeight; 
}

function removeThinkingMessage(targetChatLog) {
     if (!targetChatLog) return;
    const thinkingMsg = targetChatLog.querySelector('.thinking-message');
    if (thinkingMsg) {
        thinkingMsg.remove();
    }
}

// --- Rendering Functions (Specific Logs, Shared Sidebar) ---

function renderChatLogDocTalk() {
    chatLogDocTalk.innerHTML = '';
    const activeChat = chatSessionsDocTalk.find(chat => chat.id === activeChatIdDocTalk);

    if (activeChat) {
        chatHeaderTitleDocTalk.textContent = "Talk to Vendor Documents";
        activeChat.messages.forEach(message => {
            const senderName = message.role === 'user' ? 'Suresh N.' : 'EDF Intelligence';
            const senderType = message.role === 'user' ? 'user' : 'ai';
            // Parse content with marked before adding
            const contentHtml = marked.parse(message.content || '');
            addMessageToDOM(senderName, contentHtml, senderType, chatLogDocTalk);
        });
    } else {
        chatHeaderTitleDocTalk.textContent = "Talk to Vendor Documents";
        addMessageToDOM('EDF Intelligence', 'Select a chat or start a new one.', 'ai', chatLogDocTalk);
    }
    chatLogDocTalk.scrollTop = chatLogDocTalk.scrollHeight;
}


function renderChatLogDataChat() {
    chatLogDataChat.innerHTML = '';
    const activeChat = chatSessionsDataChat.find(chat => chat.id === activeChatIdDataChat);

    if (activeChat) {
        chatHeaderTitleDataChat.textContent = "Talk to Vendor Database";
        activeChat.messages.forEach(message => {
            const senderName = message.role === 'user' ? 'Suresh N.' : 'EDF Intelligence';
            const senderType = message.role === 'user' ? 'user' : 'ai';
             // Parse content with marked before adding
            const contentHtml = marked.parse(message.content || '');
            addMessageToDOM(senderName, contentHtml, senderType, chatLogDataChat);
        });
    } else {
        chatHeaderTitleDataChat.textContent = "Talk to Vendor Database";
        addMessageToDOM('EDF Intelligence', 'Select a chat or start a new one.', 'ai', chatLogDataChat);
    }
    chatLogDataChat.scrollTop = chatLogDataChat.scrollHeight;
}



function renderSidebar() {
    conversationList.innerHTML = ''; // Clear existing list

    // Determine which sessions to show based on the *currently active tab*
    const sessionsToRender = (activeTab === 'datachat') ? chatSessionsDataChat :
                             (activeTab === 'doctalk') ? chatSessionsDocTalk :
                             []; // Empty array if 'home' tab is active

    const activeChatId = (activeTab === 'datachat') ? activeChatIdDataChat :
                         (activeTab === 'doctalk') ? activeChatIdDocTalk :
                         null; // No active chat ID relevant for 'home' tab sidebar list

    // Only render if there are sessions for the current tab
    if (sessionsToRender.length > 0) {
        // Render conversations for the active tab, newest first
        [...sessionsToRender].reverse().forEach(chat => {
            const listItem = document.createElement('li');
            const button = document.createElement('button');
            button.classList.add('conversation-btn');
            button.dataset.chat = chat.id; // Store the chat ID
            // Add prefix to title in sidebar for clarity
            const prefix = (activeTab === 'datachat') ? '📊' : '📄';
            button.textContent = `${prefix} ${chat.title}`;

            if (chat.id === activeChatId) {
                button.classList.add('active'); // Highlight the active chat *for the current tab*
            }
            listItem.appendChild(button);
            conversationList.appendChild(listItem);
        });
    }
    // If sessionsToRender is empty (i.e., home tab is active), the list remains empty.
}


