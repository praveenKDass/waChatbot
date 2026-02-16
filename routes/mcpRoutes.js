// ============================================
// FILE: routes/mcpRoutes.js - ENHANCED
// With project selection and multi-source data retrieval
// ============================================

const express = require("express");
const router = express.Router();
const Logger = require("../utils/logger");

// Import services
const programService = require("../services/programService");
const projectService = require("../services/projectService");
const taskService = require("../services/taskService");
const storyService = require("../services/storyService");
const projectSubmissionService = require("../services/projectSubmissionService");
const Project = require("../database/models/project");
const usersQueries = require("../database/databaseQueries/userQueries");

// Middleware to log MCP requests
router.use((req, res, next) => {
  Logger.info("MCP Request Received", {
    tool: req.path.replace("/mcp/", ""),
    phoneNumber: req.body?.phoneNumber,
    timestamp: new Date().toISOString(),
  });
  next();
});

// ============================================
// PROJECT LIST & SEARCH ENDPOINTS
// ============================================

/**
 * List Programs
 * POST /mcp/list_programs
 */
router.post("/list_programs", async (req, res) => {
  try {
    const { phoneNumber, page = 1 } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: phoneNumber",
      });
    }

    Logger.info("MCP: List Programs", { phoneNumber, page });

    await programService.listPrograms(phoneNumber, page);

    res.json({
      success: true,
      action: "list_programs",
      message: "Programs displayed to user",
      phoneNumber,
      page,
    });
  } catch (error) {
    Logger.error("MCP: List Programs Error", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * List Projects
 * POST /mcp/list_projects
 */
router.post("/list_projects", async (req, res) => {
  try {
    const { phoneNumber, page = 1 } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: phoneNumber",
      });
    }

    Logger.info("MCP: List Projects", { phoneNumber, page });

    await projectService.listProjects(phoneNumber, page);

    res.json({
      success: true,
      action: "list_projects",
      message: "Projects displayed to user",
      phoneNumber,
      page,
    });
  } catch (error) {
    Logger.error("MCP: List Projects Error", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Search Project by Name
 * POST /mcp/search_project_by_name
 *
 * Returns:
 * - Single project found: Shows project details directly
 * - Multiple matches: Shows selection list (waits for user selection)
 * - No match: Returns error message
 */
router.post("/search_project_by_name", async (req, res) => {
  try {
    const { phoneNumber, projectName } = req.body;

    Logger.info("MCP: Search project by name", {
      phoneNumber,
      projectName,
    });

    if (!phoneNumber || !projectName) {
      return res.status(400).json({
        success: false,
        message: "phoneNumber and projectName are required",
      });
    }

    const result = await projectService.searchProjectByName(
      phoneNumber,
      projectName
    );

    res.json({
      success: result.success,
      action: "search_project_by_name",
      ...result,
    });
  } catch (error) {
    Logger.error("MCP: Error searching project by name", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Handle Project Selection from List
 * POST /mcp/handle_project_selection
 *
 * Called when user selects a project from the selection list
 * Example: User selects "Project 1 of 3" from search results
 *
 * Body: { phoneNumber, selectedProjectIndex }
 * selectedProjectIndex: 0-based index of the project in the last search results
 */
router.post("/handle_project_selection", async (req, res) => {
  try {
    const { phoneNumber, selectedProjectIndex } = req.body;

    Logger.info("MCP: Handle project selection", {
      phoneNumber,
      selectedIndex: selectedProjectIndex,
    });

    if (phoneNumber === undefined || selectedProjectIndex === undefined) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required parameters: phoneNumber, selectedProjectIndex",
      });
    }

    const result = await projectService.handleProjectSelection(
      phoneNumber,
      selectedProjectIndex
    );

    res.json({
      success: result.success,
      action: "handle_project_selection",
      ...result,
    });
  } catch (error) {
    Logger.error("MCP: Error handling project selection", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// TASK ENDPOINTS - SIMPLIFIED (2 main tools)
// ============================================

/**
 * List Project Tasks
 * POST /mcp/list_project_tasks
 *
 * Get data from: DB first → API fallback
 * Accepts either projectId OR projectName
 *
 * Body:
 * {
 *   "phoneNumber": "9876543210",
 *   "projectId": "proj_123" OR "projectName": "Project Accessed",
 *   "page": 1 (optional)
 * }
 */
router.post("/list_project_tasks", async (req, res) => {
  try {
    const { phoneNumber, projectId, projectName, page = 1 } = req.body;

    Logger.info("MCP: List Project Tasks", {
      phoneNumber,
      projectId,
      projectName,
      page,
    });

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: phoneNumber",
      });
    }

    if (!projectId && !projectName) {
      return res.status(400).json({
        success: false,
        error: "Either projectId or projectName is required",
      });
    }

    let finalProjectId = projectId;
    let finalProjectData = null;

    // If projectName provided but not projectId, search for the project first
    if (!projectId && projectName) {
      Logger.info("Searching for project by name first", {
        phoneNumber,
        projectName,
      });

      const searchResult = await projectService.searchProjectByName(
        phoneNumber,
        projectName,
        true //getTask
      );

      if (!searchResult.success || !searchResult.projectId) {
        return res.status(404).json({
          success: false,
          error: `Project "${projectName}" not found`,
          projectName,
        });
      }

      finalProjectId = searchResult.projectId;
    }

    // Step 1: Try to get from MongoDB (multi-source approach)
    let projectData = await Project.findOne(
      { projectId: finalProjectId, phoneNumber },
      { tasks: 1, projectName: 1, projectData: 1, solutionId: 1 }
    ).lean();

    

    // Step 2: If not in DB, fetch from API and sync
    if (!projectData) {
      Logger.info("Project not in DB, fetching from API", {
        phoneNumber,
        projectId: finalProjectId,
      });

      const apiProjectData = await projectService.fetchProjectFromAPI(
        finalProjectId
      );

      if (apiProjectData) {
        // Sync to DB
        await projectService
          .syncProjectToDB(apiProjectData, phoneNumber, 1)
          .catch((err) => {
            Logger.warn("Failed to sync project to DB", { err });
          });

        projectData = {
          projectName: apiProjectData.title || apiProjectData.name,
          solutionId: apiProjectData.solutionId,
          tasks: apiProjectData.tasks || [],
          projectData: apiProjectData,
        };
      }
    }

    if (!projectData) {
      return res.status(404).json({
        success: false,
        error: "Project not found in DB or API",
        projectId: finalProjectId,
      });
    }

    projectData.projectId = finalProjectId;

    // Update context
    await usersQueries.updateLastMessage(phoneNumber, {
      flow: "project_tasks",
      step: 0,
      context: {
        projectId: finalProjectId,
        projectName: projectData.projectName,
        solutionId: projectData.solutionId,
      },
      text: `list_tasks_${projectData.projectName}`,
    });

    // Call service to display tasks
    await taskService.showTasksMenu(phoneNumber, projectData);

    res.json({
      success: true,
      action: "list_project_tasks",
      projectId: finalProjectId,
      projectName: projectData.projectName,
      taskCount: projectData.tasks?.length || 0,
      page,
    });
  } catch (error) {
    Logger.error("MCP: List Project Tasks Error", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get Task Details
 * POST /mcp/get_task_details
 *
 * Get data from: DB first → API fallback
 * Accepts either projectId OR projectName
 *
 * Body:
 * {
 *   "phoneNumber": "9876543210",
 *   "projectId": "proj_123" OR "projectName": "Project Accessed",
 *   "taskIndex": 1
 * }
 */
router.post("/get_task_details", async (req, res) => {
  try {
    const { phoneNumber, projectId, projectName, taskIndex } = req.body;

    Logger.info("MCP: Get Task Details", {
      phoneNumber,
      projectId,
      projectName,
      taskIndex,
    });

    if (!phoneNumber || taskIndex === undefined) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required parameters: phoneNumber, taskIndex (projectId or projectName)",
      });
    }

    if (!projectId && !projectName) {
      return res.status(400).json({
        success: false,
        error: "Either projectId or projectName is required",
      });
    }

    let finalProjectId = projectId;

    // If projectName provided but not projectId, search for the project first
    if (!projectId && projectName) {
      Logger.info("Searching for project by name first", {
        phoneNumber,
        projectName,
      });

      const searchResult = await projectService.searchProjectByName(
        phoneNumber,
        projectName,
        true
      );

      if (!searchResult.success || !searchResult.projectId) {
        return res.status(404).json({
          success: false,
          error: `Project "${projectName}" not found`,
          projectName,
        });
      }

      finalProjectId = searchResult.projectId;
    }

    // Step 1: Try to get from MongoDB
    let projectData = await Project.findOne(
      { projectId: finalProjectId, phoneNumber },
      {
        projectId: 1,
        projectName: 1,
        solutionId: 1,
        tasks: 1,
        projectData: 1,
      }
    ).lean();

    // Step 2: If not in DB, fetch from API and sync
    if (!projectData) {
      Logger.info("Project not in DB, fetching from API", {
        phoneNumber,
        projectId: finalProjectId,
      });

      const apiProjectData = await projectService.fetchProjectFromAPI(
        finalProjectId
      );

      if (apiProjectData) {
        await projectService
          .syncProjectToDB(apiProjectData, phoneNumber, 1)
          .catch((err) => {
            Logger.warn("Failed to sync project to DB", { err });
          });

        projectData = {
          projectId: finalProjectId,
          projectName: apiProjectData.title || apiProjectData.name,
          solutionId: apiProjectData.solutionId,
          tasks: apiProjectData.tasks || [],
        };
      }
    }

    if (!projectData) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
        projectId: finalProjectId,
      });
    }

    // Update context with projectId and taskIndex
    await usersQueries.updateLastMessage(phoneNumber, {
      flow: "project_tasks",
      step: 1,
      context: {
        projectId: finalProjectId,
        currentTaskIndex: taskIndex,
        solutionId: projectData.solutionId,
      },
      text: "view_task_details",
    });

    // Call service to display task details
    await taskService.showTaskDetails(phoneNumber, taskIndex,finalProjectId);

    res.json({
      success: true,
      action: "get_task_details",
      projectId: finalProjectId,
      taskIndex,
      phoneNumber,
    });
  } catch (error) {
    Logger.error("MCP: Get Task Details Error", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// PROJECT ACTION ENDPOINTS
// ============================================

/**
 * Start New Project
 * POST /mcp/start_new_project
 */
router.post("/start_new_project", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: phoneNumber",
      });
    }

    Logger.info("MCP: Start New Project", { phoneNumber });

    await usersQueries.updateLastMessage(phoneNumber, {
      flow: "project_creation",
      step: 0,
      context: {},
      text: "start_new_project",
    });

    await projectService.startNewProjectFlow(phoneNumber);

    res.json({
      success: true,
      action: "start_new_project",
      phoneNumber,
    });
  } catch (error) {
    Logger.error("MCP: Start New Project Error", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});



// UPDATE TASK STATUS ENDPOINT - REFACTORED
router.post("/update_task_status", async (req, res) => {
  try {
    const { phoneNumber, projectId, projectName, taskIndex, status } = req.body;

    Logger.info("MCP: Update Task Status", {
      phoneNumber,
      projectId,
      projectName,
      taskIndex,
      status,
    });

    // Step 1: Validate required parameters
    if (!phoneNumber || taskIndex === undefined) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required parameters: phoneNumber, taskIndex (projectId or projectName)",
      });
    }

    if (!projectId && !projectName) {
      return res.status(400).json({
        success: false,
        error: "Either projectId or projectName is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status is required",
      });
    }

    // Step 2: Validate task status
    const paramValidation = await projectService.validateTaskParameters(
      phoneNumber,
      taskIndex,
      status
    );
    if (!paramValidation.success) {
      return res.status(400).json({
        success: false,
        error: paramValidation.error,
      });
    }

    // Step 3: Resolve project ID
    let finalProjectId = projectId;

    // If projectName provided but not projectId, search for the project first
    if (!projectId && projectName) {
      Logger.info("Searching for project by name first", {
        phoneNumber,
        projectName,
      });

      const searchResult = await projectService.searchProjectByName(
        phoneNumber,
        projectName,
        true
      );

      if (!searchResult.success || !searchResult.projectId) {
        return res.status(404).json({
          success: false,
          error: `Project "${projectName}" not found`,
          projectName,
        });
      }

      finalProjectId = searchResult.projectId;
    }

    // Step 4: Verify project exists (optional but recommended)
    const projectData = await Project.findOne(
      { projectId: finalProjectId, phoneNumber },
      { projectId: 1, projectName: 1, solutionId: 1 }
    ).lean();

    if (!projectData) {
      Logger.warn("Project not found in DB", {
        phoneNumber,
        projectId: finalProjectId,
      });

      // Optionally fetch from API and sync
      const apiProjectData = await projectService
        .fetchProjectFromAPI(finalProjectId)
        .catch((err) => {
          Logger.warn("Failed to fetch project from API", { err });
          return null;
        });

      if (!apiProjectData) {
        return res.status(404).json({
          success: false,
          error: "Project not found",
          projectId: finalProjectId,
        });
      }

      // Sync to DB in background
      await projectService
        .syncProjectToDB(apiProjectData, phoneNumber, 1)
        .catch((err) => {
          Logger.warn("Failed to sync project to DB", { err });
        });
    }

    // Step 5: Update context
    await usersQueries.updateLastMessage(phoneNumber, {
      flow: "project_tasks",
      step: 2,
      context: {
        projectId: finalProjectId,
        currentTaskIndex: taskIndex,
        status: status,
      },
      text: "update_task_status",
    });

    // Step 6: Call service to handle status update
    await taskService.handleStatusUpdate(
      phoneNumber,
      taskIndex,
      status,
      finalProjectId
    );

    res.json({
      success: true,
      action: "update_task_status",
      projectId: finalProjectId,
      taskIndex,
      status,
      phoneNumber,
    });
  } catch (error) {
    Logger.error("MCP: Update Task Status Error", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Submit Project
 * POST /mcp/submit_project
 */
router.post("/submit_project", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: phoneNumber",
      });
    }

    Logger.info("MCP: Submit Project", { phoneNumber });

    await projectSubmissionService.submitImprovementProject(phoneNumber);

    res.json({
      success: true,
      action: "submit_project",
      phoneNumber,
    });
  } catch (error) {
    Logger.error("MCP: Submit Project Error", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * View Certificate
 * POST /mcp/view_certificate
 */
router.post("/view_certificate", async (req, res) => {
  try {
    const { phoneNumber, projectId } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: phoneNumber",
      });
    }

    Logger.info("MCP: View Certificate", { phoneNumber, projectId });

    if (projectId) {
      await projectService.showCertificateOptions(phoneNumber, { projectId });
    } else {
      await projectSubmissionService.handleViewCertificate(phoneNumber);
    }

    res.json({
      success: true,
      action: "view_certificate",
      phoneNumber,
      projectId: projectId || "all",
    });
  } catch (error) {
    Logger.error("MCP: View Certificate Error", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Record Story
 * POST /mcp/record_story
 */
router.post("/record_story", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: phoneNumber",
      });
    }

    Logger.info("MCP: Record Story", { phoneNumber });

    await storyService.startStoryRecording(phoneNumber);

    res.json({
      success: true,
      action: "record_story",
      phoneNumber,
    });
  } catch (error) {
    Logger.error("MCP: Record Story Error", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get User Context
 * POST /mcp/get_user_context
 */
router.post("/get_user_context", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: phoneNumber",
      });
    }

    Logger.info("MCP: Get User Context", { phoneNumber });

    const lastMessage = await usersQueries.getLastMessage(phoneNumber);
    const user = await usersQueries.findUserByPhone(phoneNumber);

    const userProjects = await Project.find(
      { phoneNumber },
      { projectId: 1, projectName: 1, tasks: 1, submissionStatus: 1 }
    ).lean();

    res.json({
      success: true,
      user: {
        name: user?.name,
        phoneNumber,
      },
      currentFlow: lastMessage?.flow,
      currentContext: lastMessage?.context,
      projects: userProjects.map((p) => ({
        projectId: p.projectId,
        projectName: p.projectName,
        taskCount: p.tasks?.length || 0,
        submissionStatus: p.submissionStatus,
      })),
    });
  } catch (error) {
    Logger.error("MCP: Get User Context Error", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/update_task_evidence", async (req, res) => {
  try {
    const { phoneNumber, projectName, taskIndex } = req.body;

    Logger.info("MCP: Update Task Evidence", {
      phoneNumber,
      projectName,
      taskIndex,
    });

    // ========================================
    // Step 1: Validate required parameters
    // ========================================
    if (!phoneNumber || !projectName || taskIndex === undefined) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required parameters: phoneNumber, projectName, taskIndex",
      });
    }

    // ========================================
    // Step 2: Search for project by name
    // ========================================
    Logger.info("Searching for project by name", {
      phoneNumber,
      projectName,
    });

    const searchResult = await projectService.searchProjectByName(
      phoneNumber,
      projectName,
      true // includeProjectId
    );

    if (!searchResult.success || !searchResult.projectId) {
      Logger.warn("Project not found by name", {
        phoneNumber,
        projectName,
      });

      return res.status(404).json({
        success: false,
        error: `Project "${projectName}" not found`,
        projectName,
      });
    }

    const projectId = searchResult.projectId;

    Logger.info("Project found by name", {
      phoneNumber,
      projectName,
      projectId,
    });

    // ========================================
    // Step 3: Verify project and task exist
    // ========================================
    const project = await Project.findOne(
      { projectId, phoneNumber },
      { tasks: 1, projectName: 1 }
    ).lean();

    if (!project) {
      Logger.warn("Project not found in DB", {
        phoneNumber,
        projectId,
      });

      return res.status(404).json({
        success: false,
        error: "Project not found",
        projectId,
      });
    }

    const task = project.tasks?.[taskIndex - 1];
    if (!task) {
      Logger.warn("Task not found", {
        phoneNumber,
        projectId,
        taskIndex,
      });

      return res.status(404).json({
        success: false,
        error: `Task ${taskIndex} not found in project`,
        taskIndex,
      });
    }

    // ========================================
    // Step 4: Update user context for evidence upload
    // ========================================
    await usersQueries.updateLastMessage(phoneNumber, {
      flow: "project_tasks",
      step: 3,
      context: {
        projectId,
        projectName: project.projectName,
        currentTaskIndex: taskIndex,
        uploadingEvidence: true, // ← KEY: Enable evidence mode
        awaitingEvidenceContext: false, // ← Clear the context request
      },
      text: "update_task_evidence",
    });

    Logger.info("User context updated for evidence upload", {
      phoneNumber,
      projectId,
      taskIndex,
    });

    await taskService.handleEvidenceUploadPrompt(phoneNumber, taskIndex);

    Logger.info("Evidence upload prompt sent", {
      phoneNumber,
      projectId,
      taskIndex,
      taskName: task.taskName || task.name,
    });

    // ========================================
    // Step 6: Return success response
    // ========================================
    res.json({
      success: true,
      action: "update_task_evidence",
      projectId,
      projectName: project.projectName,
      taskIndex,
      taskName: task.taskName || task.name,
      message: "Evidence upload initiated",
    });

  } catch (error) {
    Logger.error("MCP: Update Task Evidence Error", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});



module.exports = router;