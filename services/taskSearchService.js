// ============================================
// FILE: services/taskSearchService.js - UPDATED
// Now uses aiService for intelligent extraction
// ============================================

const Logger = require("../utils/logger");
const whatsappService = require("./whatsappService");
const usersQueries = require("../database/databaseQueries/userQueries");
const Project = require("../database/models/project");
const taskService = require("./taskService");
const projectService = require("./projectService");
const aiService = require("./aiService"); // ← ADD THIS

class TaskSearchService {
  /**
   * UPDATED: Enhanced query handler that uses aiService for extraction
   */
  static async handleTaskQueryWithProject(phoneNumber, userMessage) {
    try {
      Logger.info("TaskSearchService: Handling task query with project", {
        phoneNumber,
        message: userMessage.substring(0, 80),
      });

      // ✅ FIX: Get all available projects first
      const userProjects = await Project.find(
        { phoneNumber },
        { projectId: 1, projectName: 1, tasks: 1 }
      ).lean();

      Logger.info("TaskSearchService: Available projects", {
        projectCount: userProjects.length,
        projectNames: userProjects.map((p) => p.projectName),
      });

      // ✅ FIX: Use aiService's intelligent extraction
      const extractionResults = aiService.extractProjectNameFromMessage(
        userMessage,
        userProjects
      );

      Logger.info("TaskSearchService: Project extraction results", {
        phoneNumber,
        topResult: extractionResults[0],
        allResults: extractionResults.slice(0, 3),
      });

      if (!extractionResults[0]) {
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ Could not extract project name. Please try:\n\n" +
            "• 'Show task 1 of Project Accessed'\n" +
            "• 'Task 1 of project accessed'\n" +
            "• 'Project Accessed task 1'"
        );

        return {
          success: false,
          message: "No project extracted",
        };
      }

      const projectName = extractionResults[0].projectName;
      const confidence = extractionResults[0].confidence;

      Logger.info("TaskSearchService: Extracted project name", {
        phoneNumber,
        projectName,
        confidence,
        strategy: extractionResults[0].strategy,
      });

      // ✅ FIX: Search for project using extracted name
      const projectResult = await projectService.searchProjectByName(
        phoneNumber,
        projectName
      );

      if (!projectResult.success) {
        Logger.warn("TaskSearchService: Project not found", {
          phoneNumber,
          projectName,
        });

        // Show available projects
        const availableProjectsMsg = userProjects
          .map((p, i) => `${i + 1}. ${p.projectName}`)
          .join("\n");

        await whatsappService.sendMessage(
          phoneNumber,
          `❌ Project "${projectName}" not found.\n\n` +
            `Available projects:\n${availableProjectsMsg}`
        );

        return {
          success: false,
          message: "Project not found",
          projectName,
        };
      }

      // If multiple projects match, ask user to select
      if (projectResult.multipleMatches) {
        Logger.info("TaskSearchService: Multiple projects match", {
          phoneNumber,
          projectName,
          matchCount: projectResult.matchCount,
        });

        await usersQueries.updateLastMessage(phoneNumber, {
          flow: "task_search_pending_project",
          step: 0,
          context: {
            projectName,
            userMessage,
            waitingForProjectSelection: true,
          },
          text: `select_project_for_task_${projectName}`,
        });

        await whatsappService.sendMessage(
          phoneNumber,
          `📌 Multiple projects found matching "${projectName}".\n\n` +
            `Please select the correct project from the list above.`
        );

        return {
          success: false,
          message: "Multiple projects found",
          projectName,
          matchCount: projectResult.matchCount,
          requiresUserSelection: true,
        };
      }

      // Single project found
      const projectId = projectResult.projectId;

      Logger.info("TaskSearchService: Project found", {
        phoneNumber,
        projectId,
        projectName,
      });

      // Get tasks for this project
      const tasks = await taskService.getTasks(phoneNumber, projectId);

      if (!tasks || tasks.length === 0) {
        await whatsappService.sendMessage(
          phoneNumber,
          `📋 Project "${projectName}" has no tasks yet.`
        );

        return {
          success: false,
          message: "No tasks in project",
          projectName,
          projectId,
        };
      }

      // Update context with project
      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "project_tasks",
        step: 0,
        context: {
          projectId,
          projectName,
        },
        text: `task_search_${projectName}`,
      });

      // Show all tasks (since no specific task was requested)
      await taskService.showTaskSummary(phoneNumber, tasks, 1);

      return {
        success: true,
        projectName,
        projectId,
        taskCount: tasks.length,
        message: "Tasks displayed",
      };
    } catch (error) {
      Logger.error("TaskSearchService: Error handling task query", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error processing your request. Please try again."
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse task query with project (OLD - DO NOT USE)
   * This was causing the issue - use aiService instead
   */
  static parseTaskQueryWithProject(userMessage) {
    // ❌ DEPRECATED - Use aiService.extractProjectNameFromMessage() instead
    Logger.warn(
      "TaskSearchService: parseTaskQueryWithProject is deprecated. Use aiService.extractProjectNameFromMessage()"
    );

    return {
      projectName: null,
      taskRef: null,
      type: "unknown",
      error: "Method is deprecated",
    };
  }

  /**
   * Search for tasks by name within a project
   */
  static async searchTaskByName(phoneNumber, taskName, projectId = null) {
    try {
      Logger.info("TaskSearchService: Searching for task by name", {
        phoneNumber,
        taskName,
        projectId,
      });

      // Get projectId from context if not provided
      if (!projectId) {
        const lastMessage = await usersQueries.getLastMessage(phoneNumber);
        projectId =
          lastMessage?.context?.projectId ||
          lastMessage?.context?.project?._id;

        if (!projectId) {
          await whatsappService.sendMessage(
            phoneNumber,
            "❌ No active project found. Please select a project first."
          );
          return {
            success: false,
            message: "No project context",
          };
        }
      }

      // Get tasks from project
      const tasks = await taskService.getTasks(phoneNumber, projectId);

      if (!tasks || tasks.length === 0) {
        await whatsappService.sendMessage(
          phoneNumber,
          "📋 No tasks found in this project."
        );
        return {
          success: false,
          message: "No tasks in project",
        };
      }

      // Search for matching tasks
      const matchedTasks = this.findTasksByName(tasks, taskName);

      Logger.info("TaskSearchService: Task search results", {
        phoneNumber,
        taskName,
        matchCount: matchedTasks.length,
      });

      // No matches
      if (matchedTasks.length === 0) {
        await whatsappService.sendMessage(
          phoneNumber,
          `❌ No task found with name: "${taskName}"\n\n` +
            `Available tasks:\n` +
            tasks
              .map((t, i) => `${i + 1}. ${t.taskName || t.name}`)
              .join("\n")
        );

        return {
          success: false,
          message: "No matching tasks",
          totalTasks: tasks.length,
        };
      }

      // Single match - show details
      if (matchedTasks.length === 1) {
        const taskIndex = tasks.findIndex(
          (t) =>
            (t.taskName || t.name) ===
            (matchedTasks[0].taskName || matchedTasks[0].name)
        );

        Logger.info("TaskSearchService: Single task found", {
          phoneNumber,
          taskName,
          taskIndex: taskIndex + 1,
        });

        await taskService.showTaskDetails(phoneNumber, taskIndex + 1);

        return {
          success: true,
          foundSingle: true,
          taskName: matchedTasks[0].taskName || matchedTasks[0].name,
          taskIndex: taskIndex + 1,
        };
      }

      // Multiple matches - show selection list
      Logger.info("TaskSearchService: Multiple tasks found", {
        phoneNumber,
        taskName,
        matchCount: matchedTasks.length,
      });

      await this.showTaskSelectionList(
        phoneNumber,
        matchedTasks,
        tasks,
        taskName
      );

      return {
        success: true,
        multipleMatches: true,
        matchCount: matchedTasks.length,
        taskNames: matchedTasks.map((t) => t.taskName || t.name),
      };
    } catch (error) {
      Logger.error("TaskSearchService: Error searching task by name", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error searching for tasks. Please try again."
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Find tasks matching search query
   */
  static findTasksByName(tasks, searchQuery) {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return tasks;
    }

    const query = searchQuery.toLowerCase().trim();

    return tasks.filter((task) => {
      const taskName = (task.taskName || task.name || "").toLowerCase();
      const taskDescription = (task.description || "").toLowerCase();
      const taskType = (task.type || task.taskType || "").toLowerCase();

      // Exact match
      if (taskName === query) return true;

      // Partial match in name
      if (taskName.includes(query)) return true;

      // Match in description
      if (taskDescription.includes(query)) return true;

      // Match in type
      if (taskType.includes(query)) return true;

      // Fuzzy match
      const queryWords = query.split(/\s+/);
      return queryWords.every((word) => taskName.includes(word));
    });
  }

  /**
   * Show task selection list
   */
  static async showTaskSelectionList(
    phoneNumber,
    matchedTasks,
    allTasks,
    searchTerm
  ) {
    try {
      Logger.info("TaskSearchService: Showing task selection list", {
        phoneNumber,
        taskCount: matchedTasks.length,
      });

      const listItems = matchedTasks.map((task) => {
        const taskIndex = allTasks.findIndex(
          (t) => (t.taskName || t.name) === (task.taskName || task.name)
        );

        return {
          id: `task_${taskIndex + 1}`,
          title: task.taskName || task.name,
          description: `Status: ${this.getTaskStatus(task.status)} | Type: ${
            task.type || task.taskType || "task"
          }`,
        };
      });

      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "task_search",
        step: 1,
        context: {
          searchTerm,
          action: "task_search_results",
        },
        text: `search_tasks_${searchTerm}`,
      });

      const listPayload = {
        to: `${phoneNumber}@s.whatsapp.net`,
        type: "list",
        header: { text: "Tasks Found" },
        body: {
          text: `🔍 Found ${matchedTasks.length} task(s) matching "${searchTerm}"\n\nSelect a task to view details:`,
        },
        footer: { text: "Powered by ShikshaLokam" },
        action: {
          list: {
            label: "Select Task",
            sections: [
              {
                title: "Matching Tasks",
                rows: listItems,
              },
            ],
          },
        },
      };

      await whatsappService.sendInteractiveMessage(listPayload);

      Logger.info("TaskSearchService: Task selection list sent", {
        phoneNumber,
        taskCount: matchedTasks.length,
      });
    } catch (error) {
      Logger.error("TaskSearchService: Error showing task selection list", error);
      throw error;
    }
  }

  /**
   * Get human-readable task status
   */
  static getTaskStatus(status) {
    const statusMap = {
      notStarted: "❌ Not Started",
      inProgress: "🔄 In Progress",
      completed: "✅ Completed",
    };
    return statusMap[status] || status || "Unknown";
  }

  /**
   * Get task by number
   */
  static async getTaskByNumber(phoneNumber, taskNumber) {
    try {
      Logger.info("TaskSearchService: Getting task by number", {
        phoneNumber,
        taskNumber,
      });

      const lastMessage = await usersQueries.getLastMessage(phoneNumber);
      const projectId =
        lastMessage?.context?.projectId ||
        lastMessage?.context?.project?._id;

      if (!projectId) {
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ No active project. Please select a project first."
        );
        return {
          success: false,
          message: "No project context",
        };
      }

      const tasks = await taskService.getTasks(phoneNumber, projectId);

      if (!tasks || tasks.length === 0) {
        await whatsappService.sendMessage(
          phoneNumber,
          "📋 No tasks in this project."
        );
        return {
          success: false,
          message: "No tasks",
        };
      }

      if (taskNumber < 1 || taskNumber > tasks.length) {
        await whatsappService.sendMessage(
          phoneNumber,
          `❌ Invalid task number. Please select between 1 and ${tasks.length}.`
        );
        return {
          success: false,
          message: "Invalid task number",
        };
      }

      await taskService.showTaskDetails(phoneNumber, taskNumber);

      return {
        success: true,
        taskNumber,
        taskName: tasks[taskNumber - 1].taskName || tasks[taskNumber - 1].name,
      };
    } catch (error) {
      Logger.error("TaskSearchService: Error getting task by number", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error retrieving task. Please try again."
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all tasks
   */
  static async getAllTasks(phoneNumber, projectId = null) {
    try {
      Logger.info("TaskSearchService: Getting all tasks", {
        phoneNumber,
        projectId,
      });

      if (!projectId) {
        const lastMessage = await usersQueries.getLastMessage(phoneNumber);
        projectId =
          lastMessage?.context?.projectId ||
          lastMessage?.context?.project?._id;

        if (!projectId) {
          await whatsappService.sendMessage(
            phoneNumber,
            "❌ No active project. Please select a project first."
          );
          return {
            success: false,
            message: "No project context",
          };
        }
      }

      await taskService.showTaskSummary(phoneNumber, projectId, 1);

      return {
        success: true,
        action: "show_all_tasks",
      };
    } catch (error) {
      Logger.error("TaskSearchService: Error getting all tasks", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error loading tasks. Please try again."
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle task selection from list
   */
  static async handleTaskSelection(phoneNumber, selectedTaskId) {
    try {
      const taskMatch = selectedTaskId.match(/task_(\d+)/);
      if (!taskMatch) {
        return {
          success: false,
          message: "Invalid task selection",
        };
      }

      const taskIndex = parseInt(taskMatch[1]);
      Logger.info("TaskSearchService: Task selected from list", {
        phoneNumber,
        taskIndex,
      });

      await taskService.showTaskDetails(phoneNumber, taskIndex);

      return {
        success: true,
        taskIndex,
      };
    } catch (error) {
      Logger.error("TaskSearchService: Error handling task selection", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = TaskSearchService;