// ============================================
// FILE: services/taskService.js - ENHANCED
// With recommended improvements and consistency fixes
// ============================================

const Logger = require("../utils/logger");
const { makeApiRequest } = require("../generics/services/axios");
const usersQueries = require("../database/databaseQueries/userQueries");
const whatsappService = require("./whatsappService");
const Project = require("../database/models/project");
const projectSubmissionService = require("./projectSubmissionService");
const axios = require("axios");

const TASK_TYPES = {
  content: "📚 Learning Resource",
  simple: "✅ Simple Task",
  reflection: "💭 Reflection Task",
};

const TASK_STATUS = {
  notStarted: "❌ Not Started",
  inProgress: "🔄 In Progress",
  completed: "✅ Completed",
};

class TaskService {
  /**
   * ============================================
   * HELPER METHODS
   * ============================================
   */

  /**
   * Extract projectId from project data (IMPROVED)
   */
  static _getProjectId(projectData) {
    if (!projectData) return null;
    return projectData.projectId || projectData._id || null;
  }

  /**
   * Call MCP server to fetch tasks
   */
  static async fetchTasksFromMCP(phoneNumber, projectId) {
    try {
      const mcpServerUrl =
        process.env.MCP_SERVER_URL || "http://localhost:3001";

      Logger.info("Fetching tasks from MCP server", {
        phoneNumber,
        projectId,
        mcpUrl: mcpServerUrl,
      });

      const response = await axios.post(
        `${mcpServerUrl}/mcp/tools/show_tasks`,
        { phoneNumber, projectId },
        { timeout: 30000 }
      );

      if (response.data.isError) {
        Logger.error("MCP show_tasks error", response.data);
        return null;
      }

      let tasksData = response.data.content[0]?.text;
      if (typeof tasksData === "string") {
        try {
          tasksData = JSON.parse(tasksData);
        } catch (e) {
          Logger.warn("Could not parse MCP response as JSON", { tasksData });
        }
      }

      Logger.info("Tasks fetched from MCP", {
        phoneNumber,
        projectId,
        taskCount: tasksData?.data?.tasks?.length || 0,
      });

      return tasksData?.data?.tasks || null;
    } catch (error) {
      Logger.error("Error fetching tasks from MCP", {
        message: error.message,
        projectId,
      });
      return null;
    }
  }

  /**
   * Fetch project from database
   */
  static async fetchProjectFromDB(phoneNumber, projectId) {
    if (!projectId || !phoneNumber) return null;
    try {
      const proj = await Project.findOne(
        { projectId, phoneNumber },
        {
          projectId: 1,
          projectName: 1,
          solutionId: 1,
          programId: 1,
          projectData: 1,
          tasks: 1,
        }
      ).lean();
      return proj;
    } catch (err) {
      Logger.error("Error fetching project from DB", {
        phoneNumber,
        projectId,
      });
      return null;
    }
  }

  /**
   * Get tasks with multi-source retrieval (DB → MCP)
   */
  static async getTasks(phoneNumber, projectId) {
    try {
      // Step 1: Try MongoDB
      const project = await this.fetchProjectFromDB(phoneNumber, projectId);

      if (project?.tasks?.length > 0) {
        Logger.info("Tasks loaded from MongoDB", {
          phoneNumber,
          projectId,
          taskCount: project.tasks.length,
        });
        return project.tasks;
      }

      // Step 2: Fallback to MCP
      Logger.info("Tasks not in DB, fetching from MCP", {
        phoneNumber,
        projectId,
      });

      const mcpTasks = await this.fetchTasksFromMCP(phoneNumber, projectId);

      if (mcpTasks?.length > 0) {
        Logger.info("Tasks loaded from MCP server", {
          phoneNumber,
          projectId,
          taskCount: mcpTasks.length,
        });

        // Sync to DB for future use
        await this.syncTasksToDB(phoneNumber, projectId, mcpTasks).catch(
          (err) => {
            Logger.warn("Failed to sync tasks to DB", { err });
          }
        );
        return mcpTasks;
      }

      Logger.warn("No tasks found in DB or MCP", {
        phoneNumber,
        projectId,
      });
      return [];
    } catch (error) {
      Logger.error("Error in getTasks", error);
      return [];
    }
  }

  /**
   * Sync tasks to MongoDB (IMPROVED)
   */
  static async syncTasksToDB(phoneNumber, projectId, tasks) {
    try {
      const result = await Project.findOneAndUpdate(
        { projectId, phoneNumber },
        {
          tasks,
          tasksLastSynced: new Date(),
          tasksSyncSource: "mcp",
        },
        { new: true }
      );

      Logger.info("Tasks synced to DB", {
        phoneNumber,
        projectId,
        taskCount: tasks.length,
        syncedAt: result.tasksLastSynced,
      });

      return {
        success: true,
        taskCount: tasks.length,
      };
    } catch (error) {
      Logger.error("Error syncing tasks to DB", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ============================================
   * TASK DISPLAY METHODS
   * ============================================
   */

  /**
   * Show list of tasks for a project (IMPROVED)
   */
  static async showTasksMenu(phoneNumber, projectData) {
    try {
      const projectId = this._getProjectId(projectData);

      let project = projectId
        ? await this.fetchProjectFromDB(phoneNumber, projectId)
        : projectData;

      if (!project) {
        const lastMessage = await usersQueries.getLastMessage(phoneNumber);
        const ctxProjectId = this._getProjectId(lastMessage?.context?.project);

        if (ctxProjectId) {
          const projFromDb = await this.fetchProjectFromDB(
            phoneNumber,
            ctxProjectId
          );
          if (projFromDb) {
            return await this._showTasksMenuWithProject(phoneNumber, projFromDb);
          }
        }

        Logger.warn("Project not found for showTasksMenu", { phoneNumber });
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ Project data not found. Please select project again."
        );
        return;
      }

      await this._showTasksMenuWithProject(phoneNumber, project);
    } catch (error) {
      Logger.error("Error showing tasks menu", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error loading tasks. Please try again."
      );
    }
  }

  static async _showTasksMenuWithProject(phoneNumber, project) {
    try {
      const projectId = this._getProjectId(project);

      Logger.info("Showing tasks menu", {
        phoneNumber,
        projectId,
        solutionId: project.solutionId,
      });

      const tasks = await this.getTasks(phoneNumber, projectId);

      if (tasks.length === 0) {
        await whatsappService.sendMessage(
          phoneNumber,
          "📋 No tasks available in this project."
        );
        return;
      }

      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "project_tasks",
        step: 0,
        context: {
          projectId,
          solutionId: project.solutionId,
        },
        text: "view_tasks",
      });

      await this.showTaskSummary(phoneNumber, tasks, 1);
    } catch (err) {
      Logger.error("Error in _showTasksMenuWithProject", { err });
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error loading tasks. Please try again."
      );
    }
  }

  /**
   * Show task summary with pagination
   */
  static async showTaskSummary(phoneNumber, tasksOrProjectId, page = 1) {
    try {
      let tasks = [];
      let projectId = null;

      // Normalize input
      if (Array.isArray(tasksOrProjectId)) {
        tasks = tasksOrProjectId;
        const lastMessage = await usersQueries.getLastMessage(phoneNumber);
        projectId = lastMessage?.context?.projectId;
      } else if (typeof tasksOrProjectId === "string") {
        projectId = tasksOrProjectId;
        tasks = await this.getTasks(phoneNumber, tasksOrProjectId);
      } else if (tasksOrProjectId?.tasks) {
        tasks = tasksOrProjectId.tasks;
        projectId = this._getProjectId(tasksOrProjectId);
      } else {
        const lastMessage = await usersQueries.getLastMessage(phoneNumber);
        projectId = lastMessage?.context?.projectId;
        if (projectId) {
          tasks = await this.getTasks(phoneNumber, projectId);
        }
      }

      const tasksPerPage = 5;
      const totalPages = Math.max(1, Math.ceil(tasks.length / tasksPerPage));
      page = Math.max(1, Math.min(page, totalPages));

      const start = (page - 1) * tasksPerPage;
      const paginatedTasks = tasks.slice(start, start + tasksPerPage);

      const completedCount = tasks.filter(
        (t) => t.status === "completed"
      ).length;
      const totalTasksCount = tasks.length;
      const allTasksCompleted =
        completedCount === totalTasksCount && totalTasksCount > 0;

      let summary = `📋 *Project Tasks* (Page ${page}/${totalPages})\n`;
      summary += `📊 Progress: ${completedCount}/${totalTasksCount} completed\n\n`;

      paginatedTasks.forEach((task, index) => {
        const taskNum = start + index + 1;
        const taskType = task.type || task.taskType || "simple";
        const taskIcon =
          taskType === "content"
            ? "📚"
            : taskType === "reflection"
            ? "💭"
            : "✅";
        const statusIcon =
          task.status === "notStarted"
            ? "❌"
            : task.status === "inProgress"
            ? "🔄"
            : "✅";

        const name = task.taskName || task.name || "Untitled Task";

        summary += `${taskNum}. ${taskIcon} ${name}\n`;
        summary += `   ${statusIcon} ${TASK_STATUS[task.status] || "Unknown"}\n\n`;
      });

      summary += `\nType task number (${start + 1}-${Math.min(
        start + tasksPerPage,
        tasks.length
      )}) to view details`;

      const buttons = [];

      if (page > 1) {
        buttons.push({
          type: "quick_reply",
          title: "⬅️ Previous",
          id: `tasks_prev_${page - 1}`,
        });
      }

      if (page < totalPages) {
        buttons.push({
          type: "quick_reply",
          title: "Next ➡️",
          id: `tasks_next_${page + 1}`,
        });
      }

      if (allTasksCompleted) {
        buttons.push({
          type: "quick_reply",
          title: "🎉 Submit Project",
          id: "submit_improvement_project",
        });
      }

      buttons.push({
        type: "quick_reply",
        title: "🏠 Back to Project",
        id: "back_to_project",
      },
      {
        type: "quick_reply",
        title: "🏠 Main Menu",
        id: "main_menu",
      },
    );

      if (allTasksCompleted) {
        await whatsappService.sendMessage(
          phoneNumber,
          `🎉 *Congratulations!*\n\nYou have completed all ${totalTasksCount} tasks! 🌟`
        );

        setTimeout(async () => {
          await whatsappService.sendInteractiveMessage({
            to: phoneNumber,
            type: "button",
            body: { text: summary },
            action: { buttons },
          });
        }, 1000);
      } else {
        if (buttons.length > 0) {
          await whatsappService.sendInteractiveMessage({
            to: phoneNumber,
            type: "button",
            body: { text: summary },
            action: { buttons },
          });
        } else {
          await whatsappService.sendMessage(phoneNumber, summary);
        }
      }

      Logger.info("Task summary shown", {
        phoneNumber,
        page,
        totalPages,
        allCompleted: allTasksCompleted,
      });
    } catch (error) {
      Logger.error("Error showing task summary", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error loading task summary."
      );
    }
  }

  /**
   * Show task details
   */
  static async showTaskDetails(phoneNumber, taskIndex,projectIdfromMCP=null) {
    try {
      const lastMessage = await usersQueries.getLastMessage(phoneNumber);
      const projectId = lastMessage?.context?.projectId ?? projectIdfromMCP;

      if (!projectId) {
        Logger.warn("showTaskDetails: projectId not found", { phoneNumber });
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ Project not found. Please select a project first."
        );
        return;
      }

      const tasks = await this.getTasks(phoneNumber, projectId);

      if (!tasks?.length) {
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ No tasks found. Please try again."
        );
        return;
      }

      const task = tasks[taskIndex - 1];

      if (!task) {
        await whatsappService.sendMessage(
          phoneNumber,
          `❌ Task not found. Valid tasks: 1-${tasks.length}`
        );
        return;
      }

      Logger.info("Showing task details", {
        phoneNumber,
        taskId: task._id || task.taskId,
        taskName: task.taskName || task.name,
      });

      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "project_tasks",
        step: 1,
        context: {
          projectId,
          currentTaskIndex: taskIndex,
        },
        text: "view_task_details",
      });

      const taskType = task.type || task.taskType || "simple";
      const detailsText =
        `📋 *Task ${taskIndex}: ${task.taskName || task.name}*\n\n` +
        `Type: ${TASK_TYPES[taskType] || taskType}\n` +
        `Status: ${TASK_STATUS[task.status] || "Unknown"}\n` +
        `Sequence: ${task.sequenceNumber || task.sequenceNo || "N/A"}\n\n`;

      const buttons = [];

      if (taskType === "content") {
        buttons.push({
          type: "quick_reply",
          title: "📚 View Resources",
          id: `view_resources_${taskIndex}`,
        });
      }

      buttons.push(
        {
          type: "quick_reply",
          title: "✏️ Update Status",
          id: `updated_task_status_${taskIndex}`,
        },
        {
          type: "quick_reply",
          title: "📤 Upload Evidence",
          id: `upload_evidence_${taskIndex}`,
        },
        {
          type: "quick_reply",
          title: "⬅️ Back to Tasks",
          id: "back_to_tasks",
        }
      );

      await whatsappService.sendInteractiveMessage({
        to: phoneNumber,
        type: "button",
        body: { text: detailsText },
        action: { buttons },
      });
    } catch (error) {
      Logger.error("Error showing task details", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error loading task details."
      );
    }
  }

  /**
   * Show learning resources for a task
   */
  static async showTaskResources(phoneNumber, taskIndex) {
    try {
      const lastMessage = await usersQueries.getLastMessage(phoneNumber);
      const projectId = lastMessage?.context?.projectId;

      if (!projectId) {
        await whatsappService.sendMessage(phoneNumber, "❌ Project not found.");
        return;
      }

      const tasks = await this.getTasks(phoneNumber, projectId);
      const task = tasks?.[taskIndex - 1];

      if (!task) {
        await whatsappService.sendMessage(phoneNumber, "❌ Task not found.");
        return;
      }

      const resources = task.learningResources || [];
      if (!resources.length) {
        await whatsappService.sendMessage(
          phoneNumber,
          "📚 No learning resources available for this task."
        );
        return;
      }

      Logger.info("Showing task resources", {
        phoneNumber,
        taskId: task._id || task.taskId,
        resourceCount: resources.length,
      });

      let resourcesText = `📚 *Learning Resources: ${task.taskName || task.name}*\n\n`;
      resources.forEach((resource, index) => {
        resourcesText += `${index + 1}. *${
          resource.name || resource.title || "Resource"
        }*\n`;
        if (resource.link) resourcesText += `Link: ${resource.link}\n\n`;
        else if (resource.url) resourcesText += `Link: ${resource.url}\n\n`;
      });

      resourcesText += `\n_Tap the links above to access the resources_`;

      await whatsappService.sendMessage(phoneNumber, resourcesText);

      setTimeout(async () => {
        await whatsappService.sendInteractiveMessage({
          to: phoneNumber,
          type: "button",
          body: {
            text: "Would you like to update this task status?",
          },
          action: {
            buttons: [
              {
                type: "quick_reply",
                title: "✏️ Update Status",
                id: `updated_task_status_${taskIndex}`,
              },
              {
                type: "quick_reply",
                title: "⬅️ Back to Tasks",
                id: "back_to_tasks",
              },
            ],
          },
        });
      }, 1000);
    } catch (error) {
      Logger.error("Error showing task resources", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error loading resources."
      );
    }
  }

  /**
   * ============================================
   * TASK STATUS MANAGEMENT
   * ============================================
   */

  /**
   * Show status update menu
   */
  static async showStatusUpdateMenu(phoneNumber, taskIndex) {
    try {
      const lastMessage = await usersQueries.getLastMessage(phoneNumber);
      const projectId = lastMessage?.context?.projectId;

      if (!projectId) {
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ Project not found."
        );
        return;
      }

      const tasks = await this.getTasks(phoneNumber, projectId);
      const task = tasks?.[taskIndex - 1];

      if (!task) {
        await whatsappService.sendMessage(phoneNumber, "❌ Task not found.");
        return;
      }

      Logger.info("Showing status update menu", {
        phoneNumber,
        taskId: task._id || task.taskId,
        currentStatus: task.status,
      });

      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "project_tasks",
        step: 2,
        context: {
          projectId,
          currentTaskIndex: taskIndex,
          updatingTaskStatus: true,
        },
        text: "update_task_status",
      });

      await whatsappService.sendInteractiveMessage({
        to: phoneNumber,
        type: "button",
        body: {
          text: `📋 *Update Task Status*\n\nTask: ${
            task.taskName || task.name
          }\n\nSelect new status:`,
        },
        action: {
          buttons: [
            {
              type: "quick_reply",
              title: "❌ Not Started",
              id: `set_status_notStarted_${taskIndex}`,
            },
            {
              type: "quick_reply",
              title: "🔄 In Progress",
              id: `set_status_inProgress_${taskIndex}`,
            },
            {
              type: "quick_reply",
              title: "✅ Completed",
              id: `set_status_completed_${taskIndex}`,
            },
          ],
        },
      });
    } catch (error) {
      Logger.error("Error showing status update menu", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error loading status options."
      );
    }
  }

  /**
   * Handle task status update (IMPROVED)
   */
  static async handleStatusUpdate(phoneNumber, taskIndex, newStatus,projectIdfromMCP=null) {
    try {
      const lastMessage = await usersQueries.getLastMessage(phoneNumber);
      const projectId = lastMessage?.context?.projectId ?? projectIdfromMCP;

      if (!projectId) {
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ ProjectId missing"
        );
        return;
      }

      const tasks = await this.getTasks(phoneNumber, projectId);
      const task = tasks?.[taskIndex - 1];

      if (!task) {
        await whatsappService.sendMessage(phoneNumber, "❌ Task not found.");
        return;
      }

      Logger.info("Updating task status", {
        phoneNumber,
        projectId,
        taskId: task.taskId || task._id,
        oldStatus: task.status,
        newStatus,
      });

      // Update MongoDB with timestamp
      const updateKey = `tasks.${taskIndex - 1}.status`;
      const endDateKey = `tasks.${taskIndex - 1}.endDate`;
      const lastUpdatedKey = `tasks.${taskIndex - 1}.lastUpdated`;

      await Project.updateOne(
        { projectId, phoneNumber },
        {
          $set: {
            [updateKey]: newStatus,
            [endDateKey]: new Date(),
            [lastUpdatedKey]: new Date(),
          },
        }
      );

      // Update user context
      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "project_tasks",
        step: 1,
        context: {
          projectId,
          currentTaskIndex: taskIndex,
        },
        text: "task_status_updated",
      });

      await whatsappService.sendMessage(
        phoneNumber,
        `✅ Task updated to: ${TASK_STATUS[newStatus]}\n📋 ${
          task.taskName || task.name
        }`
      );

      // Check completion
      const updatedTasks = await this.getTasks(phoneNumber, projectId);
      const allCompleted = await this.checkAllTasksCompleted(updatedTasks);

      if (allCompleted) {
        setTimeout(async () => {
          await projectSubmissionService.checkAndShowSubmitButton(phoneNumber);
        }, 1500);
      } else {
        setTimeout(async () => {
          await whatsappService.sendInteractiveMessage({
            to: phoneNumber,
            type: "button",
            body: {
              text: "Upload evidence for this task?",
            },
            action: {
              buttons: [
                {
                  type: "quick_reply",
                  title: "📤 Upload Evidence",
                  id: `upload_evidence_${taskIndex}`,
                },
                {
                  type: "quick_reply",
                  title: "⬅️ Back to Tasks",
                  id: "back_to_tasks",
                },
              ],
            },
          });
        }, 1000);
      }
    } catch (error) {
      Logger.error("Error updating task status", error);
      await whatsappService.sendMessage(phoneNumber, "❌ Error updating status.");
    }
  }

  /**
   * Check if all tasks are completed
   */
  static async checkAllTasksCompleted(tasks) {
    try {
      if (!Array.isArray(tasks)) return false;

      const completed = tasks.filter((t) => t.status === "completed").length;
      const total = tasks.length;

      Logger.info("Checking task completion", {
        completed,
        total,
        allDone: completed === total,
      });

      return completed === total && total > 0;
    } catch (error) {
      Logger.error("Error checking completion", error);
      return false;
    }
  }

  /**
   * ============================================
   * EVIDENCE & OTHER OPERATIONS
   * ============================================
   */

  /**
   * Handle evidence upload (IMPROVED)
   */
  static async handleEvidenceUploadPrompt(phoneNumber, taskIndex) {
    try {
      const lastMessage = await usersQueries.getLastMessage(phoneNumber);
      const projectId = lastMessage?.context?.projectId;

      if (!projectId) {
        await whatsappService.sendMessage(phoneNumber, "❌ Task not found.");
        return;
      }

      const tasks = await this.getTasks(phoneNumber, projectId);
      const task = tasks?.[taskIndex - 1];

      if (!task) {
        await whatsappService.sendMessage(phoneNumber, "❌ Task not found.");
        return;
      }

      Logger.info("Prompting evidence upload", {
        phoneNumber,
        taskId: task.taskId || task._id,
      });

      // Store evidence context
      const evidenceContext = {
        taskIndex,
        taskId: task.taskId || task._id,
        uploadStartedAt: new Date(),
        files: [],
      };

      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "project_tasks",
        step: 3,
        context: {
          projectId,
          currentTaskIndex: taskIndex,
          uploadingEvidence: true,
          evidence: evidenceContext,
        },
        text: "upload_evidence",
      });

      await whatsappService.sendMessage(
        phoneNumber,
        `📤 *Upload Evidence: ${task.taskName || task.name}*\n\n` +
          `You can send:\n` +
          `• Photos/Images\n` +
          `• Documents (PDF, DOC)\n` +
          `• Multiple files\n\n` +
          `Type 'done' when finished or 'cancel' to skip`
      );
    } catch (error) {
      Logger.error("Error prompting evidence upload", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error with evidence upload."
      );
    }
  }

  /**
   * Handle task pagination
   */
  static async handleTaskPagination(phoneNumber, page) {
    try {
      const lastMessage = await usersQueries.getLastMessage(phoneNumber);
      const projectId = lastMessage?.context?.projectId;

      if (!projectId) {
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ Project not found."
        );
        return;
      }

      const tasks = await this.getTasks(phoneNumber, projectId);

      if (!tasks?.length) {
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ No tasks found."
        );
        return;
      }

      await this.showTaskSummary(phoneNumber, tasks, page);
    } catch (error) {
      Logger.error("Error handling task pagination", error);
      await whatsappService.sendMessage(phoneNumber, "❌ Error loading tasks.");
    }
  }

  /**
   * Sync task updates (placeholder for API sync)
   */
  static async syncTaskUpdates(phoneNumber, taskIndex, updateData) {
    try {
      Logger.info("Syncing task updates", {
        phoneNumber,
        taskIndex,
        updateData,
      });

      // TODO: Implement actual API sync if needed
      // Could sync to MCP server or external API

      return {
        success: true,
        message: "Task updates synced",
      };
    } catch (error) {
      Logger.error("Error syncing task updates", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = TaskService;