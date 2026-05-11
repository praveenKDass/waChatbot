// // ============================================
// // FILE: services/aiService.js - 
// // ============================================
// const axios = require("axios");
// const Logger = require("../utils/logger");

// class AIService {
//   constructor() {
//     this.apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
//     this.provider = process.env.AI_PROVIDER || "anthropic";
//     this.model = process.env.AI_MODEL || "claude-3-5-sonnet-20241022";
//   }

//   /**
//    * Define MCP tools that Claude can use
//   //  */
//   // getMCPTools() {
//   //   return [
//   //     {
//   //       name: "list_programs",
//   //       description: "List all programs available for the user",
//   //       input_schema: {
//   //         type: "object",
//   //         properties: {
//   //           phoneNumber: { type: "string", description: "User's phone number" },
//   //           page: { type: "number", description: "Page number (default: 1)" },
//   //         },
//   //         required: ["phoneNumber"],
//   //       },
//   //     },
//   //     {
//   //       name: "list_projects",
//   //       description: "List all projects for the user",
//   //       input_schema: {
//   //         type: "object",
//   //         properties: {
//   //           phoneNumber: { type: "string", description: "User's phone number" },
//   //           page: { type: "number", description: "Page number (default: 1)" },
//   //         },
//   //         required: ["phoneNumber"],
//   //       },
//   //     },
//   //     {
//   //       name: "show_tasks",
//   //       description: "Show all tasks for a specific project",
//   //       input_schema: {
//   //         type: "object",
//   //         properties: {
//   //           phoneNumber: { type: "string", description: "User's phone number" },
//   //           projectId: { type: "string", description: "Project ID" },
//   //         },
//   //         required: ["phoneNumber", "projectId"],
//   //       },
//   //     },
//   //     {
//   //       name: "get_task_details",
//   //       description: "Get detailed information about a specific task",
//   //       input_schema: {
//   //         type: "object",
//   //         properties: {
//   //           phoneNumber: { type: "string", description: "User's phone number" },
//   //           projectId: { type: "string", description: "Project ID" },
//   //           taskIndex: { type: "number", description: "Task index (1-based)" },
//   //         },
//   //         required: ["phoneNumber", "projectId", "taskIndex"],
//   //       },
//   //     },
//   //     {
//   //       name: "update_task_status",
//   //       description: "Update the status of a task",
//   //       input_schema: {
//   //         type: "object",
//   //         properties: {
//   //           phoneNumber: { type: "string", description: "User's phone number" },
//   //           projectId: { type: "string", description: "Project ID" },
//   //           taskIndex: { type: "number", description: "Task index (1-based)" },
//   //           status: {
//   //             type: "string",
//   //             enum: ["notStarted", "inProgress", "completed"],
//   //             description: "New task status",
//   //           },
//   //         },
//   //         required: ["phoneNumber", "projectId", "taskIndex", "status"],
//   //       },
//   //     },
//   //     {
//   //       name: "start_new_project",
//   //       description: "Start creating a new project",
//   //       input_schema: {
//   //         type: "object",
//   //         properties: {
//   //           phoneNumber: { type: "string", description: "User's phone number" },
//   //         },
//   //         required: ["phoneNumber"],
//   //       },
//   //     },
//   //     {
//   //       name: "submit_project",
//   //       description: "Submit a completed improvement project",
//   //       input_schema: {
//   //         type: "object",
//   //         properties: {
//   //           phoneNumber: { type: "string", description: "User's phone number" },
//   //         },
//   //         required: ["phoneNumber"],
//   //       },
//   //     },
//   //     {
//   //       name: "view_certificate",
//   //       description: "View user's completion certificate",
//   //       input_schema: {
//   //         type: "object",
//   //         properties: {
//   //           phoneNumber: { type: "string", description: "User's phone number" },
//   //           projectId: {
//   //             type: "string",
//   //             description: "Project ID (optional)",
//   //           },
//   //         },
//   //         required: ["phoneNumber"],
//   //       },
//   //     },
//   //     {
//   //       name: "record_story",
//   //       description: "Start recording a story or reflection",
//   //       input_schema: {
//   //         type: "object",
//   //         properties: {
//   //           phoneNumber: { type: "string", description: "User's phone number" },
//   //         },
//   //         required: ["phoneNumber"],
//   //       },
//   //     },
//   //     {
//   //       name: "search_project_by_name",
//   //       description:
//   //         "Search for a project by name. Returns project details if found.",
//   //       input_schema: {
//   //         type: "object",
//   //         properties: {
//   //           phoneNumber: { type: "string", description: "User's phone number" },
//   //           projectName: {
//   //             type: "string",
//   //             description: "Name of the project to search for",
//   //           },
//   //         },
//   //         required: ["phoneNumber", "projectName"],
//   //       },
//   //     },
//   //     {
//   //       name: "get_user_context",
//   //       description: "Get user's current context and available projects",
//   //       input_schema: {
//   //         type: "object",
//   //         properties: {
//   //           phoneNumber: { type: "string", description: "User's phone number" },
//   //         },
//   //         required: ["phoneNumber"],
//   //       },
//   //     },
//   //   ];
//   // }

//   getMCPTools() {
//     return [
//       // ========== PROJECT TOOLS ==========
//       {
//         name: "list_programs",
//         description: "List all programs available for the user",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//             page: { type: "number", description: "Page number (default: 1)" },
//           },
//           required: ["phoneNumber"],
//         },
//       },
//       {
//         name: "list_projects",
//         description: "List all projects for the user",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//             page: { type: "number", description: "Page number (default: 1)" },
//           },
//           required: ["phoneNumber"],
//         },
//       },
//       {
//         name: "search_project_by_name",
//         description:
//           "Search for a project by name. Returns project details if found.",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//             projectName: {
//               type: "string",
//               description: "Name of the project to search for",
//             },
//           },
//           required: ["phoneNumber", "projectName"],
//         },
//       },

//       // ========== TASK TOOLS ==========
//       {
//         name: "show_tasks",
//         description: "Show all tasks for a specific project",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//             projectId: { type: "string", description: "Project ID" },
//           },
//           required: ["phoneNumber", "projectId"],
//         },
//       },
//       {
//         name: "handle_task_query_with_project",
//         description:
//           "Handle task queries with project name (e.g., 'show task 1 of Direct to Hero', 'first task in Literacy')",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//             userMessage: {
//               type: "string",
//               description: "User's message about tasks and projects",
//             },
//           },
//           required: ["phoneNumber", "userMessage"],
//         },
//       },
//       {
//         name: "handle_task_query",
//         description:
//           "Handle natural language task queries (e.g., 'show task 1', 'planning task', 'all tasks')",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//             userMessage: {
//               type: "string",
//               description: "User's message about tasks",
//             },
//           },
//           required: ["phoneNumber", "userMessage"],
//         },
//       },
//       {
//         name: "get_task_details",
//         description: "Get detailed information about a specific task",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//             projectId: { type: "string", description: "Project ID" },
//             taskIndex: { type: "number", description: "Task index (1-based)" },
//           },
//           required: ["phoneNumber", "projectId", "taskIndex"],
//         },
//       },
//       {
//         name: "update_task_status",
//         description: "Update the status of a task",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//             taskIndex: { type: "number", description: "Task index (1-based)" },
//             status: {
//               type: "string",
//               enum: ["notStarted", "inProgress", "completed"],
//               description: "New task status",
//             },
//           },
//           required: ["phoneNumber", "taskIndex", "status"],
//         },
//       },
//       {
//         name: "handle_task_selection",
//         description: "Handle task selection from list response",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//             selectedTaskId: {
//               type: "string",
//               description: 'Task ID from selection (e.g., "task_1")',
//             },
//           },
//           required: ["phoneNumber", "selectedTaskId"],
//         },
//       },

//       // ========== PROJECT ACTION TOOLS ==========
//       {
//         name: "start_new_project",
//         description: "Start creating a new project",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//           },
//           required: ["phoneNumber"],
//         },
//       },
//       {
//         name: "submit_project",
//         description: "Submit a completed improvement project",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//           },
//           required: ["phoneNumber"],
//         },
//       },
//       {
//         name: "view_certificate",
//         description: "View user's completion certificate",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//             projectId: {
//               type: "string",
//               description: "Project ID (optional)",
//             },
//           },
//           required: ["phoneNumber"],
//         },
//       },
//       {
//         name: "record_story",
//         description: "Start recording a story or reflection",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//           },
//           required: ["phoneNumber"],
//         },
//       },
//       {
//         name: "get_user_context",
//         description:
//           "Get user's current context, projects, and available tasks",
//         input_schema: {
//           type: "object",
//           properties: {
//             phoneNumber: { type: "string", description: "User's phone number" },
//           },
//           required: ["phoneNumber"],
//         },
//       },
//     ];
//   }

//   /**
//    * Build system prompt for Claude with task understanding
//    */
//   buildSystemPrompt(context) {
//     const availableProjects = context.projects || [];
//     const currentProject = context.currentProject;

//     return `You are an intelligent assistant for a WhatsApp bot managing improvement projects and tasks.

// USER CONTEXT:
// - Name: ${context.userName || "User"}
// - Projects: ${availableProjects.length}
// - Current Project: ${currentProject?.projectName || "None"}
// - Current Project ID: ${currentProject?.projectId || "None"}
// - Current Flow: ${context.currentFlow || "None"}

// CRITICAL INTENT RULES (HIGH PRIORITY):

// - Always determine intent based on the USER'S ACTION VERB first (show, open, start, submit, list).
// - Dates, numbers, years, ranges, or time phrases (e.g., "within 7 days", "2024-25", "15 Jan") are NEVER intents.
// - Any date or time-related phrase should be treated as part of the project_name unless the user explicitly asks to filter projects.
// - If a project-related verb exists, ALWAYS prefer a PROJECT ACTION intent over task or date interpretation.
// - Do NOT reduce confidence because a project name contains dates or numbers.

// TASK-RELATED PATTERNS TO RECOGNIZE:
// User might say things like:
// - "Show me tasks" / "Show tasks" / "List tasks" / "What are my tasks?" / "View tasks" / "get the tasks"
// - "Show task 1" / "Show me task 1" / "First task" / "Task number 1"
// - "Update task 2" / "Mark task 2 as done" / "Task 2 complete"
// - "I completed task 3" / "Task 1 is done" / "Finished task 2"
// - "What's task 4?" / "Tell me about task 3" / "Task details"
// - "Next task" / "Previous task" / "More tasks"

// INTENT MAPPING:

// PROJECT ACTIONS:
// - view_projects: "show projects" / "list projects" / "my projects"
// - view_project_details: "show [project name]" / "open [project name]"
// - start_improvement_project: "start project" / "new project"
// - submit_project: "submit" / "complete project"

// TASK ACTIONS (USE PROJECT CONTEXT IF AVAILABLE):
// - view_tasks: User wants to see all tasks in current/specific project
//   Examples: "show tasks", "list tasks", "view tasks"
//   Use current projectId if available: ${currentProject?.projectId || "NOT_AVAILABLE"}
  
// - view_task_details: User wants details about a specific task
//   Examples: "show task 1", "tell me about task 2", "task details"
//   Extract: taskIndex (1-based number from message)
//   Use projectId: ${currentProject?.projectId || "ASK_USER"}
  
// - update_task_status: User wants to change task status
//   Examples: "mark task 1 done", "task 2 complete", "task 3 in progress"
//   Extract: taskIndex, status (completed/inProgress/notStarted)
//   Use projectId: ${currentProject?.projectId || "ASK_USER"}
  
// - record_story: "record story" / "tell my story"
// - view_certificate: "show certificate" / "my certificate"
// - ask_help: "help" / "what can i do"




// EXTRACTION RULES:

// 1. TASK NUMBER EXTRACTION:
//    - "task 1" → taskIndex: 1
//    - "task number 2" → taskIndex: 2
//    - "first task" → taskIndex: 1
//    - "second task" → taskIndex: 2

// 2. STATUS EXTRACTION:
//    - "done", "completed", "finish" → status: "completed"
//    - "in progress", "doing", "working" → status: "inProgress"
//    - "not started", "pending" → status: "notStarted"

// 3. PROJECT CONTEXT:
//    - Current projectId available: ${currentProject?.projectId || "NO"}
//    - If user in project context, use it for task operations
//    - If no project context, ask user to select project first

// RESPONSE FORMAT (JSON ONLY):
// {
//   "intent": "intent_name",
//   "confidence": 0.0-1.0,
//   "entities": {
//     "project_name": null or string,
//     "project_id": "${currentProject?.projectId || null}",
//     "task_number": null or number,
//     "status": null or string
//   },
//   "clarification_question": "Only if confidence < 0.7"
// }

// CONFIDENCE GUIDELINES:
// - High (0.9-1.0): Clear intent with explicit details + project context available
// - Medium (0.7-0.8): Intent recognized but missing some details
// - Low (0.3-0.6): Ambiguous - ask for clarification`;
//   }

//   /**
//    * Analyze user intent using Claude API with MCP tools
//    */
//   async analyzeUserIntent(
//     userMessage,
//     conversationContext = {},
//     conversationHistory = []
//   ) {
//     try {
//       Logger.info("AIService: Analyzing intent with Claude", {
//         message: userMessage.substring(0, 50),
//         provider: this.provider,
//         hasProjectContext: !!conversationContext.currentProject,
//         projectId: conversationContext.currentProject?.projectId || "none",
//       });

//       const systemPrompt = this.buildSystemPrompt(conversationContext);

//       let response;

//       if (this.provider === "anthropic" || this.provider === "claude") {
//         response = await this.callClaude(
//           systemPrompt,
//           userMessage,
//           conversationContext.phoneNumber
//         );
//       } else {
//         response = await this.callOpenAI(systemPrompt, userMessage);
//       }

//       Logger.info("AIService: Claude raw response", {
//         type: typeof response,
//         hasToolResponse: response?.type === "tool_response",
//         response:JSON.stringify(response)
//       });

//       const intent = this.parseIntentResponse(response);

//       Logger.info("AIService: Intent analyzed", {
//         intent: intent.intent,
//         confidence: intent.confidence,
//         entities: intent.entities,
//       });

//       return intent;
//     } catch (error) {
//       Logger.error("AIService: Error analyzing intent", error);
//       return {
//         intent: "general_chat",
//         confidence: 0.3,
//         entities: {},
//         needsClarification: true,
//         clarificationQuestion:
//           "I didn't quite understand. Could you rephrase that?",
//       };
//     }
//   }

//   /**
//    * Call Claude API with MCP tools configured
//    */
//   async callClaude(systemPrompt, userMessage, phoneNumber) {
//     try {
//       const mcpTools = this.getMCPTools();

//       Logger.info("AIService: Calling Claude with MCP tools", {
//         toolCount: mcpTools.length,
//         phoneNumber,
//       });

//       const response = await axios.post(
//         "https://api.anthropic.com/v1/messages",
//         {
//           model: this.model,
//           max_tokens: 1024,
//           system: systemPrompt,
//           tools: mcpTools,
//           messages: [
//             {
//               role: "user",
//               content: userMessage,
//             },
//           ],
//         },
//         {
//           headers: {
//             "x-api-key": this.apiKey,
//             "anthropic-version": "2023-06-01",
//             "content-type": "application/json",
//           },
//           timeout: 100000,
//         }
//       );

//       if (!response.data.content || response.data.content.length === 0) {
//         throw new Error("No content in Claude response");
//       }

//       const contentBlocks = response.data.content;
//       let textResponse = "";
//       let toolCalls = [];

//       // Separate text and tool_use blocks
//       for (const block of contentBlocks) {
//         if (block.type === "text") {
//           textResponse += block.text;
//         } else if (block.type === "tool_use") {
//           toolCalls.push(block);
//         }
//       }

//       Logger.info("AIService: Claude response analyzed", {
//         hasText: textResponse.length > 0,
//         toolCallCount: toolCalls.length,
//       });

//       // If there are tool calls, execute them
//       if (toolCalls.length > 0) {
//         const toolResults = [];

//         for (const toolCall of toolCalls) {
//           Logger.info("AIService: Claude wants to use MCP tool", {
//             toolName: toolCall.name,
//             input: JSON.stringify(toolCall.input).substring(0, 100),
//           });

//           const toolResult = await this.callMCPTool(
//             toolCall.name,
//             toolCall.input,
//             phoneNumber
//           );

//           toolResults.push({
//             toolName: toolCall.name,
//             result: toolResult,
//           });
//         }

//         return {
//           type: "tool_response",
//           textMessage: textResponse || null,
//           toolResults: toolResults,
//           ...toolResults[0].result,
//         };
//       }

//       // If no tool calls, return text response
//       return textResponse;
//     } catch (error) {
//       Logger.error("AIService: Claude API error", {
//         status: error.response?.status,
//         message: error.message,
//       });
//       throw error;
//     }
//   }

//   /**
//    * Call MCP server to execute the tool
//    */
//   async callMCPTool(toolName, toolInput, phoneNumber) {
//     try {
//       const mcpServerUrl =
//         process.env.MCP_SERVER_URL || "http://localhost:3001";

//       Logger.info("AIService: Calling MCP tool", {
//         tool: toolName,
//         mcpUrl: mcpServerUrl,
//         phoneNumber,
//         input: JSON.stringify(toolInput).substring(0, 100),
//       });

//       toolInput.phoneNumber = phoneNumber;

//       const response = await axios.post(
//         `${mcpServerUrl}/mcp/tools/${toolName}`,
//         toolInput,
//         { timeout: 300000 }
//       );

//       Logger.info("AIService: MCP tool executed", {
//         tool: toolName,
//         success: !response.data.isError,
//       });

//       return response.data;
//     } catch (error) {
//       Logger.error("AIService: MCP tool call failed", {
//         tool: toolName,
//         error: error.message,
//       });

//       return {
//         isError: true,
//         content: [
//           {
//             type: "text",
//             text: `Failed to execute ${toolName}: ${error.message}`,
//           },
//         ],
//       };
//     }
//   }

//   /**
//    * Call OpenAI API (fallback)
//    */
//   async callOpenAI(systemPrompt, userMessage) {
//     try {
//       const response = await axios.post(
//         "https://api.openai.com/v1/chat/completions",
//         {
//           model: this.model,
//           messages: [
//             { role: "system", content: systemPrompt },
//             { role: "user", content: userMessage },
//           ],
//           temperature: 0.3,
//           response_format: { type: "json_object" },
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${this.apiKey}`,
//             "Content-Type": "application/json",
//           },
//           timeout: 100000,
//         }
//       );

//       return response.data.choices[0].message.content;
//     } catch (error) {
//       Logger.error("AIService: OpenAI API error", {
//         status: error.response?.status,
//         message: error.message,
//       });
//       throw error;
//     }
//   }

//   /**
//    * Parse intent response from Claude
//    */
//   parseIntentResponse(response) {
//     try {
//       // Handle tool_response format
//       if (response.type === "tool_response") {
//         Logger.info("AIService: Processing tool response", {
//           hasText: !!response.textMessage,
//           toolCount: response.toolResults?.length || 0,
//         });

//         if (response.isError) {
//           return {
//             intent: "general_chat",
//             confidence: 0.5,
//             entities: {},
//             needsClarification: true,
//             clarificationQuestion: "Something went wrong. Please try again.",
//           };
//         }

//         return {
//           intent: response.intent || "general_chat",
//           confidence: response.confidence || 0.8,
//           entities: response.entities || {},
//           toolUsed: true,
//           textMessage: response.textMessage,
//           toolResults: response.toolResults,
//         };
//       }

//       // Handle MCP error response
//       if (response.isError) {
//         Logger.warn("AIService: MCP returned error", response);
//         return {
//           intent: "general_chat",
//           confidence: 0.5,
//           entities: {},
//           needsClarification: true,
//           clarificationQuestion: "Something went wrong. Please try again.",
//         };
//       }

//       // Parse text response
//       let parsed = response;
//       if (typeof response === "string") {
//         parsed = JSON.parse(response);
//       }

//       if (!parsed.intent) {
//         throw new Error("Missing intent in response");
//       }

//       return {
//         intent: parsed.intent,
//         confidence: parsed.confidence || 0.5,
//         entities: parsed.entities || {},
//         clarificationQuestion: parsed.clarification_question,
//         needsClarification: (parsed.confidence || 0) < 0.7,
//       };
//     } catch (error) {
//       Logger.error("AIService: Error parsing response", {
//         error: error.message,
//         responseLength: JSON.stringify(response).length,
//       });

//       return {
//         intent: "general_chat",
//         confidence: 0.3,
//         entities: {},
//         needsClarification: true,
//         clarificationQuestion: "I didn't quite understand that.",
//       };
//     }
//   }

//   /**
//    * Extract task number from text
//    */
//   extractTaskNumber(text) {
//     const numMatch = text.match(/\b(\d+)\b/);
//     if (numMatch) {
//       return parseInt(numMatch[1]);
//     }

//     const ordinals = {
//       first: 1,
//       second: 2,
//       third: 3,
//       fourth: 4,
//       fifth: 5,
//       sixth: 6,
//       seventh: 7,
//       eighth: 8,
//       ninth: 9,
//       tenth: 10,
//     };

//     for (const [word, num] of Object.entries(ordinals)) {
//       if (text.toLowerCase().includes(word)) {
//         return num;
//       }
//     }

//     return null;
//   }

//   /**
//    * Extract status from text
//    */
//   extractTaskStatus(text) {
//     const lowerText = text.toLowerCase();

//     if (/done|completed|finish|complete|finished|ready/.test(lowerText)) {
//       return "completed";
//     }

//     if (/in progress|doing|working|started/.test(lowerText)) {
//       return "inProgress";
//     }

//     if (/not started|pending|haven't|havent/.test(lowerText)) {
//       return "notStarted";
//     }

//     return null;
//   }

//   /**
//    * Transcribe voice using OpenAI Whisper
//    */
//   async transcribeVoice(audioBuffer, mimeType = "audio/ogg") {
//     try {
//       Logger.info("AIService: Transcribing voice message");

//       if (!process.env.OPENAI_API_KEY) {
//         throw new Error("OpenAI API key required for voice transcription");
//       }

//       const FormData = require("form-data");
//       const form = new FormData();

//       form.append("file", audioBuffer, {
//         filename: "audio.ogg",
//         contentType: mimeType,
//       });
//       form.append("model", "whisper-1");
//       form.append("language", "en");

//       const response = await axios.post(
//         "https://api.openai.com/v1/audio/transcriptions",
//         form,
//         {
//           headers: {
//             ...form.getHeaders(),
//             Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//           },
//           timeout: 30000,
//         }
//       );

//       Logger.info("AIService: Voice transcribed successfully", {
//         textLength: response.data.text.length,
//       });

//       return {
//         success: true,
//         text: response.data.text,
//         confidence: 0.9,
//       };
//     } catch (error) {
//       Logger.error("AIService: Transcription error", error);
//       return {
//         success: false,
//         error: error.message,
//       };
//     }
//   }
// }

// module.exports = new AIService();


// ============================================
// FILE: services/aiService.js - FIXED
// Removes oneOf/allOf/anyOf from input_schema
// ============================================

const axios = require("axios");
const Logger = require("../utils/logger");

class AIService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
    this.provider = process.env.AI_PROVIDER || "anthropic";
    this.model = process.env.AI_MODEL || "claude-3-5-sonnet-20241022";
  }

  /**
   * Get MCP Tools - FIXED VERSION
   * No oneOf/allOf/anyOf at top level (Claude doesn't support these)
   */
  getMCPTools() {
    return [
      // ========== PROGRAM & PROJECT TOOLS ==========
      {
        name: "list_programs",
        description: "List all programs available for the user",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: { type: "string", description: "User's phone number" },
            page: { type: "number", description: "Page number (default: 1)" },
          },
          required: ["phoneNumber"],
        },
      },

      {
        name: "list_projects",
        description: "List all projects for the user",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: { type: "string", description: "User's phone number" },
            page: { type: "number", description: "Page number (default: 1)" },
          },
          required: ["phoneNumber"],
        },
      },

      {
        name: "search_project_by_name",
        description:
          "Search for a project by name. Can contain dates, numbers, or special characters.",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "User's phone number (required)",
            },
            projectName: {
              type: "string",
              description: "Project name to search for (required)",
            },
          },
          required: ["phoneNumber", "projectName"],
        },
      },

      {
        name: "handle_project_selection",
        description:
          "Handle user selection from project search results. Use this when user selects a project from the list.",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "User's phone number (required)",
            },
            selectedProjectIndex: {
              type: "number",
              description: "0-based index of the selected project (required)",
            },
          },
          required: ["phoneNumber", "selectedProjectIndex"],
        },
      },

      // ========== TASK TOOLS - SIMPLIFIED (2 main) ==========
      {
        name: "list_project_tasks",
        description:
          "List all tasks in a specific project. Provide either projectId or projectName.",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "User's phone number (required)",
            },
            projectId: {
              type: "string",
              description: "Project ID (optional, use if you have it)",
            },
            projectName: {
              type: "string",
              description: "Project name (optional, use if you don't have projectId)",
            },
            page: { type: "number", description: "Page number (default: 1)" },
          },
          required: ["phoneNumber"],
        },
      },

      {
        name: "get_task_details",
        description:
          "Get detailed information about a specific task. Provide either projectId or projectName along with taskIndex.",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "User's phone number (required)",
            },
            projectId: {
              type: "string",
              description: "Project ID (optional, use if you have it)",
            },
            projectName: {
              type: "string",
              description: "Project name (optional, use if you don't have projectId)",
            },
            taskIndex: {
              type: "number",
              description: "Task index/number (1-based, required)",
            },
          },
          required: ["phoneNumber", "taskIndex"],
        },
      },

      // ========== PROJECT ACTION TOOLS ==========
      {
        name: "start_new_project",
        description: "Start creating a new improvement project",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "User's phone number (required)",
            },
          },
          required: ["phoneNumber"],
        },
      },

      {
        name: "update_task_status",
        description: "Update the status of a task",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "User's phone number (required)",
            },
            projectId: {
              type: "string",
              description: "Project ID (required)",
            },
            taskIndex: {
              type: "number",
              description: "Task index (1-based, required)",
            },
            status: {
              type: "string",
              enum: ["notStarted", "inProgress", "completed"],
              description: "New task status (required)",
            },
          },
          required: ["phoneNumber", "projectId", "taskIndex", "status"],
        },
      },

      {
        name: "submit_project",
        description: "Submit a completed improvement project",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "User's phone number (required)",
            },
          },
          required: ["phoneNumber"],
        },
      },

      {
        name: "view_certificate",
        description: "View or share user certificate",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "User's phone number (required)",
            },
            projectId: {
              type: "string",
              description: "Project ID (optional)",
            },
          },
          required: ["phoneNumber"],
        },
      },

      {
        name: "record_story",
        description: "Start recording a story or reflection",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "User's phone number (required)",
            },
          },
          required: ["phoneNumber"],
        },
      },

      {
        name: "get_user_context",
        description: "Get user's current context, projects, and available actions",
        input_schema: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "User's phone number (required)",
            },
          },
          required: ["phoneNumber"],
        },
      },
    ];
  }

  /**
   * Build enhanced system prompt
   */
  uildSystemPrompt(context) {
    const availableProjects = Array.isArray(context.projects) ? context.projects : [];
    const currentProject = context.currentProject || {};
  
    return `You are an intelligent assistant for a WhatsApp bot managing improvement projects and tasks.
  
  USER CONTEXT:
  - Name: ${context.userName || "User"}
  - Phone: ${context.phoneNumber || "Unknown"}
  - Available Projects: ${availableProjects.length}
  - Current Project: ${currentProject.projectName || "None"}
  - Available Project Names: ${availableProjects.map((p) => p.projectName || "Unnamed Project").join(", ") || "None"}
  
  =====================================
  CRITICAL RULES FOR PROJECT & TASK DETECTION
  =====================================
  
  IMPORTANT: Check TASK intents BEFORE PROJECT intents!
  
  1. TASK DETAILS INTENT (PRIORITY - Check FIRST):
     When user says: "get the first task of", "show task 1", "task details", "tell me about task 2", 
     "details of task 3", "what is task 1 about", "info on task 2", "show 1st task", "show task 4", 
     "task details of task 5", "get first task of project X"
     → Extract taskIndex and projectId/projectName
     → Use: get_task_details(phoneNumber, projectId_or_projectName, taskIndex)
  
  2. TASK LIST INTENT (PRIORITY - Check SECOND):
     When user says: "get the task of", "show tasks of", "list tasks", "tasks in project X", 
     "get all the tasks for project X", "what are my tasks for project X", "show all the task", 
     "get all the task", "get all the task of project X", "all tasks of", "list all tasks"
     → Extract projectId or projectName
     → Use: list_project_tasks(phoneNumber, projectId_or_projectName)
  
  3. TASK STATUS UPDATE INTENT:
     When user says: "mark task 1 done", "complete task 2", "task 3 done", "task 1 complete", 
     "mark task 2 as done", "finish task 3"
     → Extract taskIndex and status
     → Use: update_task_status(phoneNumber, projectId, taskIndex, status)
  
  4. PROJECT INTENT DETECTION:
     When user says: "list projects", "show projects", "my projects", "all projects"
     → Use: list_projects(phoneNumber)
  
  5. SEARCH PROJECT INTENT:
     When user says: "search for project X", "find project X", "show project X", "details of project X"
     → NOTE: Only use if user is NOT asking for tasks! Check intent carefully
     → Use: search_project_by_name(phoneNumber, "X")
  
  6. PROJECT CREATION INTENT:
     When user says: "create project", "start new project", "new project", "create new project"
     → Use: start_new_project(phoneNumber)
  
  7. PROJECT SUBMISSION INTENT:
     When user says: "submit project", "finish project", "complete project", "submit the project"
     → Use: submit_project(phoneNumber)
  
  8. CERTIFICATE INTENT:
     When user says: "show certificate", "my certificate", "view certificate", "display certificate"
     → Use: view_certificate(phoneNumber)
  
  9. STORY INTENT:
     When user says: "record story", "tell my story", "share story", "record my story"
     → Use: record_story(phoneNumber)
  
  =====================================
  INTELLIGENT INTENT DETECTION LOGIC
  =====================================
  
  STEP 1: Extract keywords from user message
  - Look for TASK keywords: "task", "first task", "tasks", "task details", "task 1", "task 2", etc.
  - Look for PROJECT keywords: "project", "projects", "certificate", "story", "create", "submit"
  - Look for ACTION keywords: "done", "complete", "mark", "list", "show", "get", "find", "search"
  
  STEP 2: Intent Priority (Top-to-Bottom)
  1. If message contains "task" (singular or plural) + number/position → TASK DETAILS INTENT
  2. If message contains "task" (plural or "all the task") + project name → TASK LIST INTENT
  3. If message contains "done/complete" + "task" → TASK STATUS UPDATE INTENT
  4. If message contains "certificate" → CERTIFICATE INTENT
  5. If message contains "story" → STORY INTENT
  6. If message contains "create/start/new" + "project" → PROJECT CREATION INTENT
  7. If message contains "submit/finish/complete" + "project" → PROJECT SUBMISSION INTENT
  8. If message contains "list/show/all" + "projects" → PROJECT INTENT DETECTION
  9. If message contains "project" (single, with search intent) → SEARCH PROJECT INTENT
  
  STEP 3: Extract Parameters
  - projectId: From context or search_project_by_name
  - projectName: Extract from message after "of" or "in"
  - taskIndex: Extract numbers (1, 2, 3, first, second, etc.)
  - status: Extract from keywords (done, complete, pending, etc.)
  
  =====================================
  TOOL CALL STRATEGY
  =====================================
  
  RULE 1: When you need projectId but don't have it:
  - If user provided projectName in message → Use search_project_by_name first
  - Then use the returned projectId in subsequent calls
  - Example: User says "get first task of project X" 
    → Call search_project_by_name(phoneNumber, "project X")
    → Then call get_task_details(phoneNumber, returnedProjectId, 1)
  
  RULE 2: For ambiguous requests:
  - Ask for clarification BEFORE making tool calls
  - Example: "Which project would you like? Available: Project A, Project B"
  
  RULE 3: Parameter guidelines:
  - list_project_tasks: CAN take projectId OR projectName (not both)
  - get_task_details: CAN take projectId OR projectName (not both)
  - update_task_status: MUST have projectId (not projectName)
  
  RULE 4: Task index conversion:
  - "first task" → taskIndex = 1
  - "task 1" → taskIndex = 1
  - "second task" → taskIndex = 2
  - "task 2" → taskIndex = 2
  - "3rd task" or "task 3" → taskIndex = 3
  
  =====================================
  RESPONSE FORMAT (JSON)
  =====================================
  
  {
    "intent": "intent_name",
    "confidence": 0.0-1.0,
    "requiresClarification": true/false,
    "clarificationMessage": "Ask user to clarify...",
    "toolCalls": [
      { "name": "tool_name", "input": { "key": "value" } }
    ]
  }
  
  CONFIDENCE GUIDELINES:
  - High (0.9-1.0): Clear intent, has all required parameters
  - Medium (0.7-0.8): Intent clear but missing some details (project name, task index)
  - Low (<0.7): Ambiguous - ask for clarification
  
  =====================================
  EXAMPLE CONVERSIONS
  =====================================
  
  User: "get all the task of improvement project karnataka"
  → Intent: TASK_LIST_INTENT
  → Action: list_project_tasks(phoneNumber, "improvement project karnataka")
  → Confidence: 0.95
  
  User: "get first task of improvement project karnataka"
  → Intent: TASK_DETAILS_INTENT
  → Action: get_task_details(phoneNumber, "improvement project karnataka", 1)
  → Confidence: 0.95
  
  User: "show task 3"
  → Intent: TASK_DETAILS_INTENT (need clarification on project)
  → Clarification: "Which project? Available: [list]"
  → Confidence: 0.6
  
  User: "mark task 1 done"
  → Intent: TASK_STATUS_UPDATE_INTENT (need clarification on project)
  → Clarification: "Which project? Available: [list]"
  → Confidence: 0.6
  
  User: "show project improvement project karnataka"
  → Intent: SEARCH_PROJECT_INTENT
  → Action: search_project_by_name(phoneNumber, "improvement project karnataka")
  → Confidence: 0.9
  
  User: "list projects"
  → Intent: PROJECT_INTENT_DETECTION
  → Action: list_projects(phoneNumber)
  → Confidence: 1.0`;
  }
  
  

  /**
   * Analyze user intent
   */
  async analyzeUserIntent(
    userMessage,
    conversationContext = {},
    conversationHistory = []
  ) {
    try {
      Logger.info("AIService: Analyzing intent with enhanced project detection", {
        message: userMessage.substring(0, 80),
        hasProjectContext: !!conversationContext.currentProject,
      });

      const systemPrompt = this.buildSystemPrompt(conversationContext);

      let response;

      if (this.provider === "anthropic" || this.provider === "claude") {
        response = await this.callClaude(
          systemPrompt,
          userMessage,
          conversationContext.phoneNumber
        );
      } else {
        response = await this.callOpenAI(systemPrompt, userMessage);
      }

      Logger.info("AIService: Claude response received", {
        type: typeof response,
        hasToolCalls: response?.toolCalls?.length > 0,
      });

      const intent = this.parseIntentResponse(response);

      Logger.info("AIService: Intent analyzed", {
        intent: intent.intent,
        confidence: intent.confidence,
        requiresClarification: intent.requiresClarification,
        toolCount: intent.toolCalls?.length || 0,
      });

      return intent;
    } catch (error) {
      Logger.error("AIService: Error analyzing intent", error);
      return {
        intent: "general_chat",
        confidence: 0.3,
        entities: {},
        requiresClarification: true,
        clarificationMessage:
          "I didn't quite understand. Could you rephrase that?",
      };
    }
  }

  /**
   * Call Claude API with fixed schema
   */
  async callClaude(systemPrompt, userMessage, phoneNumber) {
    try {
      const mcpTools = this.getMCPTools();

      Logger.info("AIService: Calling Claude with fixed schema", {
        toolCount: mcpTools.length,
        phoneNumber,
      });

      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: this.model,
          max_tokens: 1024,
          system: systemPrompt,
          tools: mcpTools,
          messages: [
            {
              role: "user",
              content: userMessage,
            },
          ],
        },
        {
          headers: {
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          timeout: 100000,
        }
      );

      if (!response.data.content || response.data.content.length === 0) {
        throw new Error("No content in Claude response");
      }

      const contentBlocks = response.data.content;
      let textResponse = "";
      let toolCalls = [];

      // Separate text and tool_use blocks
      for (const block of contentBlocks) {
        if (block.type === "text") {
          textResponse += block.text;
        } else if (block.type === "tool_use") {
          toolCalls.push({
            name: block.name,
            input: block.input,
            id: block.id,
          });
        }
      }

      Logger.info("AIService: Claude response analyzed", {
        hasText: textResponse.length > 0,
        toolCallCount: toolCalls.length,
      });

      // If tool calls, return them
      if (toolCalls.length > 0) {
        return {
          type: "tool_calls",
          textMessage: textResponse || null,
          toolCalls: toolCalls,
        };
      }

      // Otherwise return text
      return {
        type: "text",
        content: textResponse,
      };
    } catch (error) {
      Logger.error("AIService: Claude API error", {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Call MCP tool
   */
  async callMCPTool(toolName, toolInput, phoneNumber) {
    try {
      const mcpServerUrl =
        process.env.MCP_SERVER_URL || "http://localhost:3001";

      Logger.info("AIService: Calling MCP tool", {
        tool: toolName,
        phoneNumber,
      });

      toolInput.phoneNumber = phoneNumber;

      const response = await axios.post(
        `${mcpServerUrl}/mcp/tools/${toolName}`,
        toolInput,
        { timeout: 300000 }
      );

      Logger.info("AIService: MCP tool executed", {
        tool: toolName,
        success: !response.data.isError,
      });

      return response.data;
    } catch (error) {
      Logger.error("AIService: MCP tool call failed", {
        tool: toolName,
        error: error.message,
      });

      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to execute ${toolName}: ${error.message}`,
          },
        ],
      };
    }
  }

  /**
   * Call OpenAI API (fallback)
   */
  async callOpenAI(systemPrompt, userMessage) {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 100000,
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      Logger.error("AIService: OpenAI API error", {
        status: error.response?.status,
        message: error.message,
      });
      throw error;
    }
  }

  /**
   * Parse intent response
   */
  parseIntentResponse(response) {
    try {
      // Handle tool_calls format
      if (response.type === "tool_calls") {
        Logger.info("AIService: Processing tool calls", {
          toolCount: response.toolCalls?.length || 0,
        });

        return {
          intent: "execute_tools",
          confidence: 0.9,
          entities: {},
          toolCalls: response.toolCalls,
          textMessage: response.textMessage,
        };
      }

      // Handle text response
      if (response.type === "text") {
        try {
          const parsed = JSON.parse(response.content);
          return {
            intent: parsed.intent || "general_chat",
            confidence: parsed.confidence || 0.5,
            entities: parsed.entities || {},
            requiresClarification: parsed.requiresClarification || false,
            clarificationMessage: parsed.clarificationMessage,
          };
        } catch (e) {
          return {
            intent: "general_chat",
            confidence: 0.6,
            entities: {},
            textResponse: response.content,
          };
        }
      }

      // Fallback
      return {
        intent: "general_chat",
        confidence: 0.3,
        entities: {},
        requiresClarification: true,
        clarificationMessage: "I didn't quite understand that.",
      };
    } catch (error) {
      Logger.error("AIService: Error parsing response", {
        error: error.message,
      });

      return {
        intent: "general_chat",
        confidence: 0.3,
        entities: {},
        requiresClarification: true,
        clarificationMessage: "I didn't quite understand that.",
      };
    }
  }

  /**
   * Extract task number from text
   */
  extractTaskNumber(text) {
    const numMatch = text.match(/\b(\d+)\b/);
    if (numMatch) {
      return parseInt(numMatch[1]);
    }

    const ordinals = {
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      fifth: 5,
    };

    for (const [word, num] of Object.entries(ordinals)) {
      if (text.toLowerCase().includes(word)) {
        return num;
      }
    }

    return null;
  }

  /**
   * Extract status from text
   */
  extractTaskStatus(text) {
    const lowerText = text.toLowerCase();

    if (/done|completed|finish|complete|finished/.test(lowerText)) {
      return "completed";
    }

    if (/in progress|doing|working|started/.test(lowerText)) {
      return "inProgress";
    }

    if (/not started|pending/.test(lowerText)) {
      return "notStarted";
    }

    return null;
  }

  /**
   * Transcribe voice using OpenAI Whisper
   */
  async transcribeVoice(audioBuffer, mimeType = "audio/ogg") {
    try {
      Logger.info("AIService: Transcribing voice message");

      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key required for voice transcription");
      }

      const FormData = require("form-data");
      const form = new FormData();

      form.append("file", audioBuffer, {
        filename: "audio.ogg",
        contentType: mimeType,
      });
      form.append("model", "whisper-1");
      form.append("language", "en");

      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          timeout: 30000,
        }
      );

      Logger.info("AIService: Voice transcribed successfully", {
        textLength: response.data.text.length,
      });

      return {
        success: true,
        text: response.data.text,
        confidence: 0.9,
      };
    } catch (error) {
      Logger.error("AIService: Transcription error", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new AIService();