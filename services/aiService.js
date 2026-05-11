// ============================================
// FILE: services/aiService.js - AI Service
// Context-Aware Project & Task Detection
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
              description:
                "Project name (optional, use if you don't have projectId)",
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
              description:
                "Project name (optional, use if you don't have projectId)",
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
        description:
          "Get user's current context, projects, and available actions",
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
        name: "update_task_evidence",
        description:
          "Initiate evidence upload for a task. User provides project name and task index.",
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
            taskIndex: {
              type: "number",
              description: "Task index/number (1-based, required)",
            },
          },
          required: ["phoneNumber", "projectName", "taskIndex"],
        },
      },
    ];
  }

  /**
   * Build enhanced system prompt with context awareness
   */


  buildSystemPrompt(context) {
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
     "mark task 2 as done", "finish task 3", "update task 1 of new project as in progress"
     → Extract taskIndex from message
     → Extract projectName from message (if mentioned)
     → Extract status from message
     → Use: update_task_status(phoneNumber, projectName_or_fallback, taskIndex, status)
  
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
  
  =====================================
  CONTEXT EXTRACTION LOGIC (CRITICAL)
  =====================================
  
  PRIORITY ORDER:
  1. Extract from USER MESSAGE first
  2. Fall back to CONTEXT only if extraction returns null
  
  PROJECT SELECTION:
  - User says: "update task 1 of newProject" 
    → Extract "newProject" from message
    → USE "newProject" (not currentProject)
    → Confidence: 0.95
  
  - User says: "update task 1"
    → No project mentioned in message
    → Extract from message = NULL
    → FALLBACK to currentProject
    → Confidence: 0.8 (depends on context)
  
  - User says: "list tasks"
    → No project in message
    → FALLBACK to currentProject
    → Ask clarification if currentProject is NULL
  
  TASK SELECTION:
  - User says: "get first task of project X"
    → Extract taskIndex = 1
    → USE 1 (from message)
  
  - User says: "get task details" (when currentTaskIndex = 2 exists)
    → No number in message
    → Extract taskIndex = NULL
    → FALLBACK to currentTaskIndex = 2
  
  CONTEXT OBJECT STRUCTURE:
  {
    phoneNumber: "+919876543210",
    userName: "User",
    
    // Current context (for fallback ONLY)
    currentProject: { 
      projectId: "p1", 
      projectName: "improvement project karnataka" 
    },
    currentTaskIndex: 2,  // fallback if no task mentioned
    
    // Available projects
    projects: [
      { projectId: "p1", projectName: "improvement project karnataka" },
      { projectId: "p2", projectName: "newProject" }
    ]
  }
  
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
  

  // =====================================
  // METHOD 2: ADD generateAutoToolCall (NEW METHOD)
  // =====================================

  generateAutoToolCall(userMessage, conversationContext) {
    try {
      const phoneNumber = conversationContext.phoneNumber;
      const currentProjectId = conversationContext.currentProject?.projectId;
      const lowerMessage = userMessage.toLowerCase();

      Logger.info("AIService: Auto-generating tool call", {
        message: userMessage.substring(0, 60),
        projectId: currentProjectId,
      });

      // Pattern 1: List all tasks
      // "show all tasks", "list tasks", "what tasks", "the task"
      if (
        /\b(show|list|get|display|what|all)\b.*\b(task|tasks|work)\b/i.test(
          userMessage
        ) &&
        !/task\s*\d/i.test(userMessage) &&
        !/(mark|complete|done|progress|status)/i.test(userMessage)
      ) {
        Logger.info("AIService: Auto-detected - List all tasks");

        if (!currentProjectId) return null;

        return {
          name: "list_project_tasks",
          input: {
            phoneNumber,
            projectId: currentProjectId,
          },
          id: `auto_${Date.now()}`,
        };
      }

      // Pattern 2: Get task details
      // "task 1", "show task 2", "what is task 3"
      if (
        /\btask\s*\d+/i.test(userMessage) ||
        /\d+\s*(?:st|nd|rd|th)?\s+task/i.test(userMessage)
      ) {
        const taskMatch =
          userMessage.match(/task\s*(\d+)/i) ||
          userMessage.match(/(\d+)\s*(?:st|nd|rd|th)?\s+task/i);
        const taskIndex = taskMatch ? parseInt(taskMatch[1]) : null;

        if (
          taskIndex &&
          !/(mark|complete|done|status|progress|start|finish)/i.test(
            userMessage
          )
        ) {
          Logger.info("AIService: Auto-detected - Get task details", {
            taskIndex,
          });

          if (!currentProjectId) return null;

          return {
            name: "get_task_details",
            input: {
              phoneNumber,
              projectId: currentProjectId,
              taskIndex: taskIndex,
            },
            id: `auto_${Date.now()}`,
          };
        }
      }

      // Pattern 3: Update task status
      // "mark task 1 done", "complete task 2", "task 3 in progress"
      if (
        /(mark|complete|done|status|progress|start|finish|doing|in\s+progress)/i.test(
          userMessage
        ) &&
        (/\btask\s*\d+/i.test(userMessage) || /\d+\s*task/i.test(userMessage))
      ) {
        const taskMatch =
          userMessage.match(/task\s*(\d+)/i) ||
          userMessage.match(/(\d+)\s*task/i);
        const taskIndex = taskMatch ? parseInt(taskMatch[1]) : null;
        const status = this.extractTaskStatus(userMessage);

        if (taskIndex && status) {
          Logger.info("AIService: Auto-detected - Update task status", {
            taskIndex,
            status,
          });

          if (!currentProjectId) return null;

          return {
            name: "update_task_status",
            input: {
              phoneNumber,
              projectId: currentProjectId,
              taskIndex: taskIndex,
              status: status,
            },
            id: `auto_${Date.now()}`,
          };
        }
      }

      // Pattern 4: Ambiguous task request
      // "show task", "what task", "task details" (without number)
      if (
        /\b(show|list|get|tell|what|details|info|about)\b.*\btask/i.test(
          userMessage
        ) &&
        !/task\s*\d/i.test(userMessage) &&
        !/(mark|complete|done|status)/i.test(userMessage)
      ) {
        Logger.info(
          "AIService: Auto-detected - Ambiguous task (default to list)"
        );

        if (!currentProjectId) return null;

        // Default to listing when ambiguous
        return {
          name: "list_project_tasks",
          input: {
            phoneNumber,
            projectId: currentProjectId,
          },
          id: `auto_${Date.now()}`,
        };
      }

      Logger.warn("AIService: Could not auto-detect intent", {
        message: userMessage.substring(0, 80),
      });

      return null;
    } catch (error) {
      Logger.error("AIService: Error in generateAutoToolCall", error);
      return null;
    }
  }

  // =====================================
  // METHOD 3: REPLACE analyzeUserIntent
  // =====================================

  // async analyzeUserIntent(
  //   userMessage,
  //   conversationContext = {},
  //   conversationHistory = []
  // ) {
  //   try {
  //     Logger.info("AIService: Analyzing intent with context awareness", {
  //       message: userMessage.substring(0, 80),
  //       hasProjectContext: !!conversationContext.currentProject,
  //       currentProjectId: conversationContext.currentProject?.projectId,
  //       currentProjectName: conversationContext.currentProject?.projectName,
  //     });

  //     const systemPrompt = this.buildSystemPrompt(conversationContext);

  //     let response;

  //     if (this.provider === "anthropic" || this.provider === "claude") {
  //       response = await this.callClaude(
  //         systemPrompt,
  //         userMessage,
  //         conversationContext.phoneNumber
  //       );
  //     } else {
  //       response = await this.callOpenAI(systemPrompt, userMessage);
  //     }

  //     Logger.info("AIService: Claude response received", {
  //       type: response?.type,
  //       hasToolCalls: response?.toolCalls?.length > 0,
  //     });

  //     // 🔴 CRITICAL: If Claude returned TEXT but we have context, auto-generate tool calls
  //     if (
  //       response.type === "text" &&
  //       conversationContext.currentProject?.projectId
  //     ) {
  //       Logger.warn(
  //         "AIService: Claude returned text instead of tool_use. Attempting auto-generation."
  //       );

  //       const autoToolCall = this.generateAutoToolCall(
  //         userMessage,
  //         conversationContext
  //       );

  //       if (autoToolCall) {
  //         Logger.info("AIService: Auto-generated tool call", {
  //           toolName: autoToolCall.name,
  //           projectId: autoToolCall.input.projectId,
  //         });

  //         response = {
  //           type: "tool_calls",
  //           toolCalls: [autoToolCall],
  //           textMessage: null,
  //         };
  //       }
  //     }

  //     const intent = this.parseIntentResponse(response);

  //     Logger.info("AIService: Intent analyzed", {
  //       intent: intent.intent,
  //       confidence: intent.confidence,
  //       usedContext: intent.usedContext,
  //       requiresClarification: intent.requiresClarification,
  //       toolCount: intent.toolCalls?.length || 0,
  //     });

  //     return intent;
  //   } catch (error) {
  //     Logger.error("AIService: Error analyzing intent", error);
  //     return {
  //       intent: "general_chat",
  //       confidence: 0.3,
  //       entities: {},
  //       requiresClarification: true,
  //       clarificationMessage:
  //         "I didn't quite understand. Could you rephrase that?",
  //     };
  //   }
  // }

  async analyzeUserIntent(
    userMessage,
    conversationContext = {},
    conversationHistory = []
  ) {
    try {
      Logger.info("AIService: Analyzing intent with context awareness", {
        message: userMessage.substring(0, 80),
        hasProjectContext: !!conversationContext.currentProject,
        flow: conversationContext.flow,
        currentProjectId: conversationContext.currentProject?.projectId,
      });

      // ========================================
      // 🔴 SPECIAL CASE: Evidence Upload Intent
      // ========================================
      if (conversationContext.flow === "process_evidence_upload") {
        Logger.info("AIService: Detected evidence upload flow", {
          message: userMessage.substring(0, 80),
        });

        // Extract project name and task index via Claude
        const extracted = await this.extractEvidenceUploadData(userMessage);

        if (extracted.projectName && extracted.taskIndex) {
          Logger.info("AIService: Extracted evidence upload data", {
            projectName: extracted.projectName,
            taskIndex: extracted.taskIndex,
          });

          // Return tool call for MCP endpoint
          return {
            intent: "update_task_evidence",
            confidence: 0.95,
            usedContext: false,
            toolCalls: [
              {
                name: "update_task_evidence",
                input: {
                  phoneNumber: conversationContext.phoneNumber,
                  projectName: extracted.projectName,
                  taskIndex: extracted.taskIndex,
                },
                id: `evidence_${Date.now()}`,
              },
            ],
            textMessage: null,
          };
        } else {
          Logger.warn("AIService: Could not extract evidence upload data", {
            userMessage: userMessage.substring(0, 80),
          });

          // Return clarification request
          return {
            intent: "evidence_upload_clarification",
            confidence: 0.3,
            usedContext: false,
            entities: {},
            requiresClarification: true,
            clarificationMessage:
              `Could not understand format.\n\n` +
              `Please send: "ProjectName TaskNumber"\n` +
              `Example: "Q4 Project 1"`,
          };
        }
      }

      // ========================================
      // NORMAL FLOW: Existing Logic
      // ========================================
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
        type: response?.type,
        hasToolCalls: response?.toolCalls?.length > 0,
      });

      // 🔴 CRITICAL: If Claude returned TEXT but we have context, auto-generate tool calls
      if (
        response.type === "text" &&
        conversationContext.currentProject?.projectId
      ) {
        Logger.warn(
          "AIService: Claude returned text instead of tool_use. Attempting auto-generation."
        );

        const autoToolCall = this.generateAutoToolCall(
          userMessage,
          conversationContext
        );

        if (autoToolCall) {
          Logger.info("AIService: Auto-generated tool call", {
            toolName: autoToolCall.name,
            projectId: autoToolCall.input.projectId,
          });

          response = {
            type: "tool_calls",
            toolCalls: [autoToolCall],
            textMessage: null,
          };
        }
      }

      const intent = this.parseIntentResponse(response);

      Logger.info("AIService: Intent analyzed", {
        intent: intent.intent,
        confidence: intent.confidence,
        usedContext: intent.usedContext,
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
   * Extract evidence upload data (project name + task index) via Claude
   *
   * Input: "Q4 Project task 1"
   * Output: { projectName: "Q4 Project", taskIndex: 1 }
   */
  async extractEvidenceUploadData(userMessage) {
    try {
      Logger.info("AIService: Extracting evidence upload data", {
        message: userMessage.substring(0, 80),
      });

      const prompt = `
Extract ONLY project name and task index from this message:
"${userMessage}"

Return ONLY a JSON object with NO markdown, NO backticks:
{"projectName": "...", "taskIndex": 1}

Examples:
"Q4 Project task 1" → {"projectName": "Q4 Project", "taskIndex": 1}
"project marketing 2" → {"projectName": "marketing", "taskIndex": 2}
"Q4 1" → {"projectName": "Q4", "taskIndex": 1}
"automation task 3" → {"projectName": "automation", "taskIndex": 3}

If cannot extract, return: {"projectName": null, "taskIndex": null}
`;

      const response = await this.callClaude(
        "Extract JSON from user message. Return ONLY valid JSON.",
        prompt,
        ""
      );

      let parsed = null;
      try {
        // Extract JSON from response
        const jsonMatch =
          response?.content?.match(/\{[\s\S]*\}/) ||
          response?.textMessage?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        Logger.warn("Failed to parse evidence extraction response", {
          error: parseError.message,
        });
      }

      if (parsed?.projectName && parsed?.taskIndex) {
        return {
          projectName: parsed.projectName.trim(),
          taskIndex: parseInt(parsed.taskIndex),
        };
      }

      // Fallback: basic regex
      const numberMatch = userMessage.match(/\b(\d)\b/);
      if (numberMatch) {
        const projectName = userMessage.replace(numberMatch[0], "").trim();
        if (projectName) {
          return {
            projectName,
            taskIndex: parseInt(numberMatch[1]),
          };
        }
      }

      return { projectName: null, taskIndex: null };
    } catch (error) {
      Logger.error("AIService: Error extracting evidence upload data", error);
      return { projectName: null, taskIndex: null };
    }
  }
  /**
   * Call Claude API with fixed schema and context awareness
   */
  async callClaude(systemPrompt, userMessage, phoneNumber) {
    try {
      const mcpTools = this.getMCPTools();

      Logger.info("AIService: Calling Claude with context-aware schema", {
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
        toolNames: toolCalls.map((t) => t.name),
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
   * Call MCP tool with auto-detection of currentProject
   */
  async callMCPTool(
    toolName,
    toolInput,
    phoneNumber,
    conversationContext = {}
  ) {
    try {
      const mcpServerUrl =
        process.env.MCP_SERVER_URL || "http://localhost:3001";

      // Auto-inject projectId if not provided and context has it
      if (
        !toolInput.projectId &&
        !toolInput.projectName &&
        conversationContext.currentProject?.projectId &&
        (toolName === "list_project_tasks" ||
          toolName === "get_task_details" ||
          toolName === "update_task_status")
      ) {
        toolInput.projectId = conversationContext.currentProject.projectId;

        Logger.info("AIService: Auto-injected projectId from context", {
          tool: toolName,
          projectId: toolInput.projectId,
          projectName: conversationContext.currentProject.projectName,
        });
      }

      Logger.info("AIService: Calling MCP tool", {
        tool: toolName,
        phoneNumber,
        projectId: toolInput.projectId,
        projectName: toolInput.projectName,
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
   * Parse intent response with context awareness
   */
  parseIntentResponse(response) {
    try {
      // Handle tool_calls format
      if (response.type === "tool_calls") {
        Logger.info("AIService: Processing tool calls with context", {
          toolCount: response.toolCalls?.length || 0,
        });

        return {
          intent: "execute_tools",
          confidence: 0.9,
          usedContext: true,
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
            usedContext: parsed.usedContext || false,
            contextDetails: parsed.contextDetails,
            entities: parsed.entities || {},
            requiresClarification: parsed.requiresClarification || false,
            clarificationMessage: parsed.clarificationMessage,
          };
        } catch (e) {
          return {
            intent: "general_chat",
            confidence: 0.6,
            usedContext: false,
            entities: {},
            textResponse: response.content,
          };
        }
      }

      // Fallback
      return {
        intent: "general_chat",
        confidence: 0.3,
        usedContext: false,
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
        usedContext: false,
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
      sixth: 6,
      seventh: 7,
      eighth: 8,
      ninth: 9,
      tenth: 10,
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
