// let token;
// let pdfcontext = '';

// window.onload = async function () {
//     try {
//         const response = await fetch("https://llmfoundry.straive.com/token", {
//             credentials: "include",
//         });

//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }

//         const data = await response.json();

//         if (data && data.token) {
//             token = data.token;
//             console.log("Token retrieved");

//             await extractPdfText("vendordata_v2.pdf");
//             await extractPdfText("1356991_RADSHIELD TECHNOLOGIES_Minutes of Meetings.pdf");
//             await extractPdfText("1356991_RADSHIELD TECHNOLOGIES_RFI Response.pdf");

//             await generateAndDisplaySuggestedPrompts();

//         } else {
//             token = null;
//             console.warn("Token not found in response");
//         }
//     } catch (error) {
//         token = null;
//         console.error("Error fetching token:", error);
//     }
// };

// async function extractPdfText(pdfUrl) {
//     try {
//         const loadingTask = pdfjsLib.getDocument(pdfUrl);
//         const pdf = await loadingTask.promise;
//         let fullText = '';

//         for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
//             const page = await pdf.getPage(pageNum);
//             const textContent = await page.getTextContent();
//             const pageText = textContent.items.map(item => item.str).join(' ');
//             fullText += pageText + '\n';
//         }

//         pdfcontext += fullText;
//         console.log("Extracted PDF Text");

//     } catch (error) {
//         console.error("Error extracting PDF text:", error);
//     }
// }

// async function extractPdfText(pdfUrl) {
//     try {
//         const loadingTask = pdfjsLib.getDocument(pdfUrl);
//         const pdf = await loadingTask.promise;
//         let fullText = '';

//         for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
//             const page = await pdf.getPage(pageNum);
//             const textContent = await page.getTextContent();
//             const pageText = textContent.items.map(item => item.str).join(' ');
//             fullText += pageText + '\n';
//         }

//         pdfcontext += fullText;
//         console.log("Extracted PDF Text");

//     } catch (error) {
//         console.error("Error extracting PDF text:", error);
//     }
// }

// async function generateAndDisplaySuggestedPrompts(context = pdfcontext) { 
//     const suggestedPromptsContainer = document.getElementById('suggestedPrompts');
//     if (!suggestedPromptsContainer) {
//         console.error("suggestedPrompts container not found in the DOM.");
//         return;
//     }

//     try {
//         const prompts = await getSuggestedPrompts(context); 
//         suggestedPromptsContainer.innerHTML = '';

//         prompts.forEach(prompt => {
//             const button = document.createElement('button');
//             button.classList.add('prompt-btn');
//             button.textContent = prompt;
//             suggestedPromptsContainer.appendChild(button);
//         });
//     } catch (error) {
//         console.error("Error generating or displaying suggested prompts:", error);
//         suggestedPromptsContainer.innerHTML = '<p>Failed to load suggested prompts.</p>';
//     }
// }

// async function getSuggestedPrompts(context) {
//     if (!token) {
//         console.warn("Token is not available.  Returning default prompts.");
//         return [
//             "List out all vendors manufacturing valves",
//             "Give all details about vendors in city Mumbai",
//             "Vendors who provides Radiation Shielding"
//         ];
//     }

//     const promptGenerationPrompt = `Given the following context about EDF vendors, generate three distinct and useful question prompts that a user might ask.  The prompts should be specific and actionable, encouraging the user to explore the data.  Do not include any introductory or concluding remarks, just the three prompts, each on a new line.  Do not include any numbering or bullet points. Don't write any mathematical prompt and should be something that can be answered appropriately from context. The prompts should be less than 80 characters each.\n\nContext:\n${context}`;

//     try {
//         const response = await fetch("https://llmfoundry.straive.com/gemini/v1beta/openai/chat/completions", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 "Authorization": `Bearer ${token}:EDF-Vendors`
//             },
//             body: JSON.stringify({
//                 model: "gemini-2.0-flash-exp",
//                 messages: [{
//                     role: "user",
//                     content: promptGenerationPrompt
//                 }],
//             }),
//         });

//         if (!response.ok) {
//             const errorBody = await response.text();
//             console.error("API Error Response:", errorBody);
//             throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
//         }

//         const data = await response.json();

//         if (data.choices && data.choices.length > 0 && data.choices[0].message) {
//             const content = data.choices[0].message.content;
//             // Split the content into individual prompts based on newlines
//             const prompts = content.trim().split('\n').map(prompt => prompt.trim());
//             return prompts;
//         } else {
//             console.error("Unexpected API response structure:", data);
//             throw new Error("Received an unexpected response structure from the API.");
//         }
//     } catch (error) {
//         console.error("Error generating suggested prompts:", error);
//         return [
//             "List out all vendors manufacturing valves",
//             "Give all details about vendors in city Mumbai",
//             "Vendors who provides Radiation Shielding"
//         ];
//     }
// }


// document.addEventListener('DOMContentLoaded', () => {
//     const chatLog = document.getElementById('chatLog');
//     const userInput = document.getElementById('userInput');
//     const sendButton = document.getElementById('sendButton');
//     const newChatBtn = document.getElementById('newChatBtn');
//     const conversationList = document.getElementById('conversationList');
//     const suggestedPromptsContainer = document.getElementById('suggestedPrompts');
//     const chatHeaderTitle = document.getElementById('chatHeaderTitle');

//     let chatSessions = [];
//     let activeChatId = null;


//     startNewChat();


//     sendButton.addEventListener('click', handleSendMessage);
//     userInput.addEventListener('keypress', (event) => {
//         if (event.key === 'Enter' && !event.shiftKey) {
//             event.preventDefault();
//             handleSendMessage();
//         }
//     });
//     newChatBtn.addEventListener('click', startNewChat);
//     suggestedPromptsContainer.addEventListener('click', handleSuggestedPromptClick);
//     conversationList.addEventListener('click', handleConversationSwitch);


//     function generateChatId() {
//         return `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
//     }

//     function startNewChat() {
//         const newChatId = generateChatId();
//         const newChat = {
//             id: newChatId,
//             title: "DataChat",
//             messages: [
//                 { role: "assistant", content: "Hello! How can I assist you with vendor intelligence today?" }
//             ]
//         };

//         chatSessions.push(newChat);
//         setActiveChat(newChatId);
//         console.log("Started new chat:", newChatId);
//     }

//     function setActiveChat(chatId) {
//         activeChatId = chatId;
//         renderChatLog();
//         renderSidebar();
//         userInput.value = '';
//         userInput.focus();
//     }

//     async function handleSendMessage() {
//         const userText = userInput.value.trim();
//         if (userText === '' || !activeChatId) return;

//         const activeChat = chatSessions.find(chat => chat.id === activeChatId);
//         if (!activeChat) return;

//         const userMessage = { role: "user", content: userText };
//         activeChat.messages.push(userMessage);
//         addMessageToDOM('Suresh N.', userText, 'user');
//         userInput.value = '';

//         if (activeChat.messages.filter(m => m.role === 'user').length > 5) {
//             activeChat.messages = activeChat.messages.filter((msg, index) => {
//                 return (msg.role !== 'user' || index >= activeChat.messages.length - 5);
//             });
//         }

//         if (activeChat.messages.filter(m => m.role === 'user').length === 1) {
//             activeChat.title = userText.substring(0, 35) + (userText.length > 35 ? '...' : '');
//             renderSidebar();
//         }

//         addMessageToDOM('EDF Intelligence', 'Thinking...', 'ai', true);

//         const systemMessage = {
//             role: "system",
//             content: `You are a helpful assistant specializing in EDF vendor intelligence. Base your answers *primarily* on the following context extracted from vendordata.pdf:\n\n---\n${pdfcontext}\n---\n\nIf the information is not in the context, state that. For any user's query if responding in table is a better way then go for a tabular response.`
//         };

//         const messagesForApi = [systemMessage, ...activeChat.messages.map(({ role, content }) => ({ role, content }))];


//         try {
//             const aiResponseContent = await getAIResponse(messagesForApi);

//             removeThinkingMessage();

//             const aiMessage = { role: "assistant", content: aiResponseContent };
//             const aiHtmlResponse = marked.parse(aiResponseContent);
//             activeChat.messages.push(aiMessage);
//             addMessageToDOM('EDF Intelligence', aiHtmlResponse, 'ai');
//             const combinedContext = `${userText}\n${aiResponseContent}`;
//             console.log(combinedContext);
//             await generateAndDisplaySuggestedPrompts(combinedContext);

//         } catch (error) {
//             console.error("Error fetching AI response:", error);
//             removeThinkingMessage();
//             addMessageToDOM('EDF Intelligence', `Sorry, I encountered an error. ${error.message}`, 'ai', false, true); // Display error
//         }
//     }

//     async function getAIResponse(messages) {
//         if (token === "YOUR_LLMFOUNDRY_TOKEN_HERE") {
//             console.warn("API Token is not set. Using placeholder response.");
//             await new Promise(resolve => setTimeout(resolve, 800));
//             return `(Placeholder Response) To get a real answer, please set your token in script.js. You asked about: "${messages[messages.length - 1].content.substring(0, 50)}..."`;
//         }


//         try {
//             // const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
//             //     method: "POST",
//             //     headers: {
//             //         "Content-Type": "application/json",
//             //         "Authorization": `Bearer ${token}:EDF-Vendors` 
//             //     },
//             //     body: JSON.stringify({
//             //         model: "gpt-4o-mini",
//             //         messages: messages,
//             //     }),
//             // });

//             const response = await fetch("https://llmfoundry.straive.com/gemini/v1beta/openai/chat/completions", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}:EDF-Vendors`
//                 },
//                 body: JSON.stringify({
//                     model: "gemini-2.0-flash-exp",
//                     messages: messages,
//                 }),
//             });

//             if (!response.ok) {
//                 const errorBody = await response.text();
//                 console.error("API Error Response:", errorBody);
//                 throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
//             }

//             const data = await response.json();

//             if (data.choices && data.choices.length > 0 && data.choices[0].message) {
//                 return data.choices[0].message.content;
//             } else {
//                 console.error("Unexpected API response structure:", data);
//                 throw new Error("Received an unexpected response structure from the API.");
//             }
//         } catch (error) {
//             console.error("Error in getAIResponse:", error);
//             throw error;
//         }
//     }


//     function addMessageToDOM(sender, text, senderType, isThinking = false, isError = false) {
//         const messageDiv = document.createElement('div');
//         messageDiv.classList.add('message', `${senderType}-message`);
//         if (isThinking) {
//             messageDiv.classList.add('thinking-message');
//         }
//         if (isError) {
//             messageDiv.classList.add('error-message');
//         }


//         const senderInfoDiv = document.createElement('div');
//         senderInfoDiv.classList.add('message-sender');

//         const avatarSpan = document.createElement('span');
//         avatarSpan.classList.add('avatar');
//         avatarSpan.textContent = sender.substring(0, 2).toUpperCase();
//         if (senderType === 'ai') {
//             avatarSpan.classList.add('ai-avatar');
//         }

//         const senderNameSpan = document.createElement('span');
//         senderNameSpan.textContent = ` ${sender} `;

//         const timestampSpan = document.createElement('span');
//         timestampSpan.classList.add('timestamp');
//         timestampSpan.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

//         senderInfoDiv.appendChild(avatarSpan);
//         senderInfoDiv.appendChild(senderNameSpan);
//         senderInfoDiv.appendChild(timestampSpan);

//         const contentDiv = document.createElement('div');
//         contentDiv.classList.add('message-content');
//         contentDiv.innerHTML = text.replace(/\n/g, '');

//         messageDiv.appendChild(senderInfoDiv);
//         messageDiv.appendChild(contentDiv);

//         chatLog.appendChild(messageDiv);

//         chatLog.scrollTop = chatLog.scrollHeight;
//     }

//     function removeThinkingMessage() {
//         const thinkingMsg = chatLog.querySelector('.thinking-message');
//         if (thinkingMsg) {
//             thinkingMsg.remove();
//         }
//     }

//     function renderChatLog() {
//         chatLog.innerHTML = '';
//         const activeChat = chatSessions.find(chat => chat.id === activeChatId);

//         if (activeChat) {
//             chatHeaderTitle.textContent = activeChat.title || "Data Chat";
//             activeChat.messages.forEach(message => {
//                 const senderName = message.role === 'user' ? 'Suresh N.' : 'EDF Intelligence';
//                 const senderType = message.role === 'user' ? 'user' : 'ai';
//                 addMessageToDOM(senderName, marked.parse(message.content), senderType);
//             });
//         } else {
//             chatHeaderTitle.textContent = "Data Chat";
//             addMessageToDOM('EDF Intelligence', 'Select a chat or start a new one.', 'ai');
//         }
//         chatLog.scrollTop = chatLog.scrollHeight;
//     }

//     function renderSidebar() {
//         conversationList.innerHTML = '';
//         [...chatSessions].reverse().forEach(chat => {
//             const listItem = document.createElement('li');
//             const button = document.createElement('button');
//             button.classList.add('conversation-btn');
//             button.dataset.chat = chat.id;
//             button.textContent = `🔍 ${chat.title}`;
//             if (chat.id === activeChatId) {
//                 button.classList.add('active');
//             }
//             listItem.appendChild(button);
//             conversationList.appendChild(listItem);
//         });
//     }


//     function handleSuggestedPromptClick(event) {
//         if (event.target.classList.contains('prompt-btn')) {
//             const promptText = event.target.textContent;
//             userInput.value = promptText;
//             handleSendMessage();
//         }
//     }

//     function handleConversationSwitch(event) {
//         if (event.target.classList.contains('conversation-btn')) {
//             const chatId = event.target.dataset.chat;
//             if (chatId && chatId !== activeChatId) {
//                 console.log(`Switching to chat: ${chatId}`);
//                 setActiveChat(chatId);
//             }
//         }
//     }

// });






let token;
let pdfcontext = '';
let pdfSummary = ''; 

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

            await extractPdfText("vendordata_v2.pdf");
            pdfSummary = await generatePdfSummary(pdfcontext);

            // await extractPdfText("1356991_RADSHIELD TECHNOLOGIES_Minutes of Meetings.pdf");
            // await extractPdfText("1356991_RADSHIELD TECHNOLOGIES_RFI Response.pdf");            
            await generateAndDisplaySuggestedPrompts(pdfSummary);

        } else {
            token = null;
            console.warn("Token not found in response");
        }
    } catch (error) {
        token = null;
        console.error("Error fetching token:", error);
    }
};

async function extractPdfText(pdfUrl) {
    try {
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
        console.log("Extracted PDF Text");

    } catch (error) {
        console.error("Error extracting PDF text:", error);
    }
}

document.getElementById('file-attach').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const fileType = file.name.split('.').pop().toLowerCase();
        extractTextFromFile(fileType, file);
    }
});

async function extractTextFromFile(fileType, fileData) {
    let extractedContext='';
    try {
        if (fileType === 'pdf') {
            extractedContext += await extractTextFromPDF(fileData);
        } else if (fileType === 'doc' || fileType === 'docx') {
            extractedContext += await extractTextFromWord(fileData);
        } else if (fileType === 'xls' || fileType === 'xlsx') {
            extractedContext += await extractTextFromExcel(fileData);
        }
        console.log("Extracted Text:", extractedContext);
        pdfcontext+=extractedContext;
    } catch (error) {
        console.error("Error extracting text:", error);
    }
}

async function extractTextFromPDF(fileData) {
    try {
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

    const summaryPrompt = `Summarize the following text about EDF vendors in approximately 150 words.  Focus on the key topics and entities mentioned.  Do not include any introductory or concluding remarks.\n\nContext:\n${context}`;

    try {
        const response = await fetch("https://llmfoundry.straive.com/gemini/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}:EDF-Vendors`
            },
            body: JSON.stringify({
                model: "gemini-2.0-flash-exp",
                messages: [{
                    role: "user",
                    content: summaryPrompt
                }],
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API Error Response:", errorBody);
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content.trim();
        } else {
            console.error("Unexpected API response structure:", data);
            throw new Error("Received an unexpected response structure from the API.");
        }
    } catch (error) {
        console.error("Error generating PDF summary:", error);
        return "Error generating summary.  Using default summary.";
    }
}

async function generateAndDisplaySuggestedPrompts(context) {
    const suggestedPromptsContainer = document.getElementById('suggestedPrompts');
    if (!suggestedPromptsContainer) {
        console.error("suggestedPrompts container not found in the DOM.");
        return;
    }

    try {
        const prompts = await getSuggestedPrompts(context);
        suggestedPromptsContainer.innerHTML = '';

        prompts.forEach(prompt => {
            const button = document.createElement('button');
            button.classList.add('prompt-btn');
            button.textContent = prompt;
            suggestedPromptsContainer.appendChild(button);
        });
    } catch (error) {
        console.error("Error generating or displaying suggested prompts:", error);
        suggestedPromptsContainer.innerHTML = '<p>Failed to load suggested prompts.</p>';
    }
}

async function getSuggestedPrompts(context) {
    if (!token) {
        console.warn("Token is not available.  Returning default prompts.");
        return [
            "List out all vendors manufacturing valves",
            "Give all details about vendors in city Mumbai",
            "Vendors who provides Radiation Shielding"
        ];
    }

    const promptGenerationPrompt = `Given the following summary about EDF vendors, generate three distinct and useful question prompts that a user might ask.  The prompts should be specific and actionable, encouraging the user to explore the data.  Do not include any introductory or concluding remarks, just the three prompts, each on a new line.  Do not include any numbering or bullet points. Don't write any mathematical prompt and should be something that can be answered appropriately from context. The prompts should be less than 80 characters each.\n\nSummary:\n${context}`;

    try {
        const response = await fetch("https://llmfoundry.straive.com/gemini/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}:EDF-Vendors`
            },
            body: JSON.stringify({
                model: "gemini-2.0-flash-exp",
                messages: [{
                    role: "user",
                    content: promptGenerationPrompt
                }],
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API Error Response:", errorBody);
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            const content = data.choices[0].message.content;
            const prompts = content.trim().split('\n').map(prompt => prompt.trim());
            return prompts;
        } else {
            console.error("Unexpected API response structure:", data);
            throw new Error("Received an unexpected response structure from the API.");
        }
    } catch (error) {
        console.error("Error generating suggested prompts:", error);
        return [
            "List out all vendors manufacturing valves",
            "Give all details about vendors in city Mumbai",
            "Vendors who provides Radiation Shielding"
        ];
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const chatLog = document.getElementById('chatLog');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const newChatBtn = document.getElementById('newChatBtn');
    const conversationList = document.getElementById('conversationList');
    const suggestedPromptsContainer = document.getElementById('suggestedPrompts');
    const chatHeaderTitle = document.getElementById('chatHeaderTitle');

    let chatSessions = [];
    let activeChatId = null;


    startNewChat();


    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });
    newChatBtn.addEventListener('click', startNewChat);
    suggestedPromptsContainer.addEventListener('click', handleSuggestedPromptClick);
    conversationList.addEventListener('click', handleConversationSwitch);


    function generateChatId() {
        return `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    function startNewChat() {
        const newChatId = generateChatId();
        const newChat = {
            id: newChatId,
            title: "DataChat",
            messages: [
                { role: "assistant", content: "Hello! How can I assist you with vendor intelligence today?" }
            ]
        };

        chatSessions.push(newChat);
        setActiveChat(newChatId);
        // console.log("Started new chat:", newChatId);
    }

    function setActiveChat(chatId) {
        activeChatId = chatId;
        renderChatLog();
        renderSidebar();
        userInput.value = '';
        userInput.focus();
    }

    async function handleSendMessage() {
        const userText = userInput.value.trim();
        if (userText === '' || !activeChatId) return;

        const activeChat = chatSessions.find(chat => chat.id === activeChatId);
        if (!activeChat) return;

        const userMessage = { role: "user", content: userText };
        activeChat.messages.push(userMessage);
        addMessageToDOM('Suresh N.', userText, 'user');
        userInput.value = '';

        if (activeChat.messages.filter(m => m.role === 'user').length > 5) {
            activeChat.messages = activeChat.messages.filter((msg, index) => {
                return (msg.role !== 'user' || index >= activeChat.messages.length - 5);
            });
        }

        if (activeChat.messages.filter(m => m.role === 'user').length === 1) {
            activeChat.title = userText.substring(0, 35) + (userText.length > 35 ? '...' : '');
            renderSidebar();
        }

        addMessageToDOM('EDF Intelligence', 'Thinking...', 'ai', true);

        const systemMessage = {
            role: "system",
            content: `You are a helpful assistant specializing in EDF vendor intelligence. Base your answers *primarily* on the following context extracted from vendordata.pdf:\n\n---\n${pdfcontext}\n---\n\nIf the information is not in the context, state that. For any user's query if responding in table is a better way then go for a tabular response.`
        };

        const messagesForApi = [systemMessage, ...activeChat.messages.map(({ role, content }) => ({ role, content }))];
        console.log(messagesForApi);

        try {
            const aiResponseContent = await getAIResponse(messagesForApi);

            removeThinkingMessage();

            const aiMessage = { role: "assistant", content: aiResponseContent };
            const aiHtmlResponse = marked.parse(aiResponseContent);
            activeChat.messages.push(aiMessage);
            addMessageToDOM('EDF Intelligence', aiHtmlResponse, 'ai');
            const combinedContext = `User's Previous Query: ${userText}\n\n AI Response to User's Query: ${aiResponseContent}\n\n Summary of the context: ${pdfSummary}`; 
            // console.log(combinedContext);
            await generateAndDisplaySuggestedPrompts(combinedContext);

        } catch (error) {
            console.error("Error fetching AI response:", error);
            removeThinkingMessage();
            addMessageToDOM('EDF Intelligence', `Sorry, I encountered an error. ${error.message}`, 'ai', false, true); // Display error
        }
    }

    async function getAIResponse(messages) {
        if (token === "YOUR_LLMFOUNDRY_TOKEN_HERE") {
            console.warn("API Token is not set. Using placeholder response.");
            await new Promise(resolve => setTimeout(resolve, 800));
            return `(Placeholder Response) To get a real answer, please set your token in script.js. You asked about: "${messages[messages.length - 1].content.substring(0, 50)}..."`;
        }


        try {
            const response = await fetch("https://llmfoundry.straive.com/gemini/v1beta/openai/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}:EDF-Vendors`
                },
                body: JSON.stringify({
                    model: "gemini-2.0-flash-exp",
                    messages: messages,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error("API Error Response:", errorBody);
                throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                return data.choices[0].message.content;
            } else {
                console.error("Unexpected API response structure:", data);
                throw new Error("Received an unexpected response structure from the API.");
            }
        } catch (error) {
            console.error("Error in getAIResponse:", error);
            throw error;
        }
    }


    function addMessageToDOM(sender, text, senderType, isThinking = false, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${senderType}-message`);
        if (isThinking) {
            messageDiv.classList.add('thinking-message');
        }
        if (isError) {
            messageDiv.classList.add('error-message');
        }


        const senderInfoDiv = document.createElement('div');
        senderInfoDiv.classList.add('message-sender');

        const avatarSpan = document.createElement('span');
        avatarSpan.classList.add('avatar');
        avatarSpan.textContent = sender.substring(0, 2).toUpperCase();
        if (senderType === 'ai') {
            avatarSpan.classList.add('ai-avatar');
        }

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
        contentDiv.innerHTML = text.replace(/\n/g, '');

        messageDiv.appendChild(senderInfoDiv);
        messageDiv.appendChild(contentDiv);

        chatLog.appendChild(messageDiv);

        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function removeThinkingMessage() {
        const thinkingMsg = chatLog.querySelector('.thinking-message');
        if (thinkingMsg) {
            thinkingMsg.remove();
        }
    }

    function renderChatLog() {
        chatLog.innerHTML = '';
        const activeChat = chatSessions.find(chat => chat.id === activeChatId);

        if (activeChat) {
            chatHeaderTitle.textContent = activeChat.title || "Data Chat";
            activeChat.messages.forEach(message => {
                const senderName = message.role === 'user' ? 'Suresh N.' : 'EDF Intelligence';
                const senderType = message.role === 'user' ? 'user' : 'ai';
                addMessageToDOM(senderName, marked.parse(message.content), senderType);
            });
        } else {
            chatHeaderTitle.textContent = "Data Chat";
            addMessageToDOM('EDF Intelligence', 'Select a chat or start a new one.', 'ai');
        }
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function renderSidebar() {
        conversationList.innerHTML = '';
        [...chatSessions].reverse().forEach(chat => {
            const listItem = document.createElement('li');
            const button = document.createElement('button');
            button.classList.add('conversation-btn');
            button.dataset.chat = chat.id;
            button.textContent = `🔍 ${chat.title}`;
            if (chat.id === activeChatId) {
                button.classList.add('active');
            }
            listItem.appendChild(button);
            conversationList.appendChild(listItem);
        });
    }


    function handleSuggestedPromptClick(event) {
        if (event.target.classList.contains('prompt-btn')) {
            const promptText = event.target.textContent;
            userInput.value = promptText;
            handleSendMessage();
        }
    }

    function handleConversationSwitch(event) {
        if (event.target.classList.contains('conversation-btn')) {
            const chatId = event.target.dataset.chat;
            if (chatId && chatId !== activeChatId) {
                // console.log(`Switching to chat: ${chatId}`);
                setActiveChat(chatId);
            }
        }
    }

});






// let token;
// let pdfcontext = '';

// window.onload = async function () {
//     try {
//         const response = await fetch("https://llmfoundry.straive.com/token", {
//             credentials: "include",
//         });

//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }

//         const data = await response.json();

//         if (data && data.token) {
//             token = data.token;
//             console.log("Token retrieved");

//             await extractPdfText("vendordata_v2.pdf");
//             await extractPdfText("1356991_RADSHIELD TECHNOLOGIES_Minutes of Meetings.pdf");
//             await extractPdfText("1356991_RADSHIELD TECHNOLOGIES_RFI Response.pdf");


//         } else {
//             token = null;
//             console.warn("Token not found in response");
//         }
//     } catch (error) {
//         token = null;
//         console.error("Error fetching token:", error);
//     }
// };

// async function extractPdfText(pdfUrl) {
//     try {
//         const loadingTask = pdfjsLib.getDocument(pdfUrl);
//         const pdf = await loadingTask.promise;
//         let fullText = '';

//         for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
//             const page = await pdf.getPage(pageNum);
//             const textContent = await page.getTextContent();
//             const pageText = textContent.items.map(item => item.str).join(' ');
//             fullText += pageText + '\n';
//         }

//         pdfcontext += fullText;
//         console.log("Extracted PDF Text");

//     } catch (error) {
//         console.error("Error extracting PDF text:", error);
//     }
// }

// document.addEventListener('DOMContentLoaded', () => {
//     const chatLog = document.getElementById('chatLog');
//     const userInput = document.getElementById('userInput');
//     const sendButton = document.getElementById('sendButton');
//     const newChatBtn = document.getElementById('newChatBtn');
//     const conversationList = document.getElementById('conversationList');
//     const suggestedPromptsContainer = document.getElementById('suggestedPrompts');
//     const chatHeaderTitle = document.getElementById('chatHeaderTitle');

//     let chatSessions = [];
//     let activeChatId = null;


//     startNewChat();


//     sendButton.addEventListener('click', handleSendMessage);
//     userInput.addEventListener('keypress', (event) => {
//         if (event.key === 'Enter' && !event.shiftKey) {
//             event.preventDefault();
//             handleSendMessage();
//         }
//     });
//     newChatBtn.addEventListener('click', startNewChat);
//     suggestedPromptsContainer.addEventListener('click', handleSuggestedPromptClick);
//     conversationList.addEventListener('click', handleConversationSwitch);


//     function generateChatId() {
//         return `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
//     }

//     function startNewChat() {
//         const newChatId = generateChatId();
//         const newChat = {
//             id: newChatId,
//             title: "DataChat",
//             messages: [
//                 { role: "assistant", content: "Hello! How can I assist you with vendor intelligence today?" }
//             ]
//         };

//         chatSessions.push(newChat);
//         setActiveChat(newChatId);
//         console.log("Started new chat:", newChatId);
//     }

//     function setActiveChat(chatId) {
//         activeChatId = chatId;
//         renderChatLog();
//         renderSidebar();
//         userInput.value = '';
//         userInput.focus();
//     }

//     async function handleSendMessage() {
//         const userText = userInput.value.trim();
//         if (userText === '' || !activeChatId) return;

//         const activeChat = chatSessions.find(chat => chat.id === activeChatId);
//         if (!activeChat) return;

//         const userMessage = { role: "user", content: userText };
//         activeChat.messages.push(userMessage);
//         addMessageToDOM('Suresh N.', userText, 'user');
//         userInput.value = '';

//         if (activeChat.messages.filter(m => m.role === 'user').length > 5) {
//             activeChat.messages = activeChat.messages.filter((msg, index) => {
//                 return (msg.role !== 'user' || index >= activeChat.messages.length - 5);
//             });
//         }

//         if (activeChat.messages.filter(m => m.role === 'user').length === 1) {
//             activeChat.title = userText.substring(0, 35) + (userText.length > 35 ? '...' : '');
//             renderSidebar();
//         }

//         const systemMessage = {
//             role: "system",
//             content: `You are a helpful assistant specializing in EDF vendor intelligence. Base your answers *primarily* on the following context extracted from vendordata.pdf:\n\n---\n${pdfcontext}\n---\n\nIf the information is not in the context, state that.`
//         };

//         const messagesForApi = [systemMessage, ...activeChat.messages.map(({ role, content }) => ({ role, content }))];


//         try {
//             await getAIResponse(messagesForApi, activeChat);

//             // removeThinkingMessage(); // Handled in streaming

//             // const aiMessage = { role: "assistant", content: aiResponseContent }; // Handled in streaming
//             // const aiHtmlResponse = marked.parse(aiResponseContent); // Handled in streaming
//             // activeChat.messages.push(aiMessage); // Handled in streaming
//             // addMessageToDOM('EDF Intelligence', aiHtmlResponse, 'ai'); // Handled in streaming

//         } catch (error) {
//             console.error("Error fetching AI response:", error);
//             removeThinkingMessage();
//             addMessageToDOM('EDF Intelligence', `Sorry, I encountered an error. ${error.message}`, 'ai', false, true); // Display error
//         }
//     }

//     async function getAIResponse(messages, activeChat) {
//         if (token === "YOUR_LLMFOUNDRY_TOKEN_HERE") {
//             console.warn("API Token is not set. Using placeholder response.");
//             await new Promise(resolve => setTimeout(resolve, 800));
//             return `(Placeholder Response) To get a real answer, please set your token in script.js. You asked about: "${messages[messages.length - 1].content.substring(0, 50)}..."`;
//         }

//         let aiMessageDiv = document.createElement('div');
//         aiMessageDiv.classList.add('message', 'ai-message');
//         let aiMessageContent = '';

//         const senderInfoDiv = document.createElement('div');
//         senderInfoDiv.classList.add('message-sender');

//         const avatarSpan = document.createElement('span');
//         avatarSpan.classList.add('avatar', 'ai-avatar');
//         avatarSpan.textContent = 'EI';

//         const senderNameSpan = document.createElement('span');
//         senderNameSpan.textContent = ` EDF Intelligence `;

//         const timestampSpan = document.createElement('span');
//         timestampSpan.classList.add('timestamp');
//         timestampSpan.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

//         senderInfoDiv.appendChild(avatarSpan);
//         senderInfoDiv.appendChild(senderNameSpan);
//         senderInfoDiv.appendChild(timestampSpan);

//         const contentDiv = document.createElement('div');
//         contentDiv.classList.add('message-content');
//         aiMessageDiv.appendChild(senderInfoDiv);
//         aiMessageDiv.appendChild(contentDiv);
//         chatLog.appendChild(aiMessageDiv);
//         chatLog.scrollTop = chatLog.scrollHeight;

//         try {
//             const response = await fetch("https://llmfoundry.straive.com/gemini/v1beta/openai/chat/completions", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}:EDF-Vendors`
//                 },
//                 body: JSON.stringify({
//                     model: "gemini-2.0-flash-thinking-exp",
//                     stream: true,
//                     messages: messages,
//                 }),
//             });

//             if (!response.ok) {
//                 const errorBody = await response.text();
//                 console.error("API Error Response:", errorBody);
//                 throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
//             }

//             if (!response.body) {
//                 throw new Error('No response body from API.');
//             }

//             const reader = response.body.getReader();
//             const decoder = new TextDecoder();

//             while (true) {
//                 const { done, value } = await reader.read();
//                 if (done) {
//                     break;
//                 }
//                 const chunk = decoder.decode(value);

//                 try {
//                     const jsonChunks = chunk.split('\n').filter(line => line.startsWith('data:'));
//                     for (const jsonChunk of jsonChunks) {
//                         const data = jsonChunk.substring(5);

//                         // Skip `[DONE]` and any non-JSON messages
//                         if (data === '[DONE]' || !data) continue;

//                         try {
//                             const parsedData = JSON.parse(data);
//                             const textChunk = parsedData?.choices?.[0]?.delta?.content || "";
//                             aiMessageContent += textChunk;
//                             const aiHtmlResponse = marked.parse(aiMessageContent);
//                             contentDiv.innerHTML = aiHtmlResponse;
//                             chatLog.scrollTop = chatLog.scrollHeight;
//                         } catch (parseError) {
//                             console.error('Error parsing JSON chunk:', parseError, data);
//                         }
//                     }
//                 } catch (parseError) {
//                     console.error('Error processing chunk data:', parseError, chunk);
//                 }
//             }

//             const aiMessage = { role: "assistant", content: aiMessageContent };
//             activeChat.messages.push(aiMessage);

//         } catch (error) {
//             console.error("Error in getAIResponse:", error);
//             aiMessageDiv.remove();
//             throw error;
//         }
//     }


//     function addMessageToDOM(sender, text, senderType, isThinking = false, isError = false) {
//         const messageDiv = document.createElement('div');
//         messageDiv.classList.add('message', `${senderType}-message`);
//         if (isThinking) {
//             messageDiv.classList.add('thinking-message');
//         }
//         if (isError) {
//             messageDiv.classList.add('error-message');
//         }


//         const senderInfoDiv = document.createElement('div');
//         senderInfoDiv.classList.add('message-sender');

//         const avatarSpan = document.createElement('span');
//         avatarSpan.classList.add('avatar');
//         avatarSpan.textContent = sender.substring(0, 2).toUpperCase();
//         if (senderType === 'ai') {
//             avatarSpan.classList.add('ai-avatar');
//         }

//         const senderNameSpan = document.createElement('span');
//         senderNameSpan.textContent = ` ${sender} `;

//         const timestampSpan = document.createElement('span');
//         timestampSpan.classList.add('timestamp');
//         timestampSpan.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

//         senderInfoDiv.appendChild(avatarSpan);
//         senderInfoDiv.appendChild(senderNameSpan);
//         senderInfoDiv.appendChild(timestampSpan);

//         const contentDiv = document.createElement('div');
//         contentDiv.classList.add('message-content');
//         contentDiv.innerHTML = text.replace(/\n/g, '');

//         messageDiv.appendChild(senderInfoDiv);
//         messageDiv.appendChild(contentDiv);

//         chatLog.appendChild(messageDiv);

//         chatLog.scrollTop = chatLog.scrollHeight;
//     }

//     function removeThinkingMessage() {
//         const thinkingMsg = chatLog.querySelector('.thinking-message');
//         if (thinkingMsg) {
//             thinkingMsg.remove();
//         }
//     }

//     function renderChatLog() {
//         chatLog.innerHTML = '';
//         const activeChat = chatSessions.find(chat => chat.id === activeChatId);

//         if (activeChat) {
//             chatHeaderTitle.textContent = activeChat.title || "Data Chat";
//             activeChat.messages.forEach(message => {
//                 const senderName = message.role === 'user' ? 'Suresh N.' : 'EDF Intelligence';
//                 const senderType = message.role === 'user' ? 'user' : 'ai';
//                 addMessageToDOM(senderName, message.content, senderType);
//             });
//         } else {
//             chatHeaderTitle.textContent = "Data Chat";
//             addMessageToDOM('EDF Intelligence', 'Select a chat or start a new one.', 'ai');
//         }
//         chatLog.scrollTop = chatLog.scrollHeight;
//     }

//     function renderSidebar() {
//         conversationList.innerHTML = '';
//         [...chatSessions].reverse().forEach(chat => {
//             const listItem = document.createElement('li');
//             const button = document.createElement('button');
//             button.classList.add('conversation-btn');
//             button.dataset.chat = chat.id;
//             button.textContent = `🔍 ${chat.title}`;
//             if (chat.id === activeChatId) {
//                 button.classList.add('active');
//             }
//             listItem.appendChild(button);
//             conversationList.appendChild(listItem);
//         });
//     }


//     function handleSuggestedPromptClick(event) {
//         if (event.target.classList.contains('prompt-btn')) {
//             const promptText = event.target.textContent;
//             userInput.value = promptText;
//             handleSendMessage();
//         }
//     }

//     function handleConversationSwitch(event) {
//         if (event.target.classList.contains('conversation-btn')) {
//             const chatId = event.target.dataset.chat;
//             if (chatId && chatId !== activeChatId) {
//                 console.log(`Switching to chat: ${chatId}`);
//                 setActiveChat(chatId);
//             }
//         }
//     }

// });