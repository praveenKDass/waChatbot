// ============================================
// FILE: services/projectService.js - COMPLETE
// With multi-source data retrieval + all existing functions
// ============================================

const whatsappService = require("./whatsappService");
const usersQueries = require("../database/databaseQueries/userQueries");
const Logger = require("../utils/logger");
const config = require("../config/config");
const { makeApiRequest } = require("../generics/services/axios");
const Project = require("../database/models/project");
const taskService = require("./taskService");
const _ = require('lodash');
class ProjectService {
  constructor() {
    this.apiBaseUrl = config.backend.apiUrl;
  }

  /**
   * ============================================
   * MULTI-SOURCE DATA RETRIEVAL METHODS
   * ============================================
   */

  /**
   * Get project data from multiple sources
   * Priority: 1. MongoDB → 2. Backend API → 3. Solution-based
   */
  async getProjectData(phoneNumber, projectId, solutionId = null) {
    try {
      Logger.info("Getting project data from multiple sources", {
        phoneNumber,
        projectId,
        solutionId,
      });

      // Step 1: Try MongoDB first
      const dbProject = await Project.findOne(
        { phoneNumber, projectId },
        {
          projectId: 1,
          projectName: 1,
          solutionId: 1,
          description: 1,
          status: 1,
          duration: 1,
          tasks: 1,
          projectData: 1,
        }
      ).lean();

      if (dbProject) {
        Logger.info("Project found in MongoDB", {
          phoneNumber,
          projectId,
          source: "db",
        });
        return {
          source: "db",
          project: dbProject,
          projectId: dbProject.projectId,
          solutionId: dbProject.solutionId,
          projectType: "solutionWithProject",
        };
      }

      // Step 2: Try backend API
      if (projectId) {
        const apiProject = await this.fetchProjectFromAPI(projectId);
        if (apiProject) {
          Logger.info("Project found in backend API", {
            phoneNumber,
            projectId,
            source: "api",
          });
          await this.syncProjectToDB(apiProject, phoneNumber, 1).catch(
            (err) => {
              Logger.warn("Failed to sync project to DB", { err });
            }
          );
          return {
            source: "api",
            project: apiProject,
            projectId: apiProject._id || projectId,
            solutionId: apiProject.solutionId,
            projectType: "solutionWithProject",
          };
        }
      }

      // Step 3: Try solution-based approach
      if (solutionId) {
        const apiSolution = await this.fetchSolutionFromAPI(solutionId);
        if (apiSolution) {
          Logger.info("Solution found in backend API", {
            phoneNumber,
            solutionId,
            source: "api_solution",
          });
          return {
            source: "api_solution",
            project: apiSolution,
            projectId: null,
            solutionId: apiSolution._id || solutionId,
            projectType: "solutionWithoutProject",
          };
        }
      }

      return null;
    } catch (error) {
      Logger.error("Error getting project data from multiple sources", error);
      return null;
    }
  }

  /**
   * Fetch project from API
   */
  async fetchProjectFromAPI(projectId) {
    try {
      if (!projectId) return null;

      const url = `${this.apiBaseUrl}/project/v1/userProjects/details/${projectId}`;
      const response = await makeApiRequest(
        "POST",
        url,
        process.env.ELEVATE_AUTH_TOKEN,
        {
          state: "6852c86c7248c20014b38a4d",
          district: "6852c8ae7248c20014b38a57",
          block: "6852c8de7248c20014b38a9d",
          cluster: "6852c9027248c20014b38c34",
          professional_role: "6825950197b5680013e6a17c",
          professional_subroles:
            "6825ad1f97b5680013e844fa,6825ad1f97b5680013e844fb",
          organizations: "[object Object]",
        }
      );

      return response?.data?.result || response?.data || null;
    } catch (error) {
      Logger.error("Error fetching project from API", {
        projectId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Fetch solution from API
   */
  async fetchSolutionFromAPI(solutionId) {
    try {
      if (!solutionId) return null;

      const url = `${this.apiBaseUrl}/project/v1/solutions/details/${solutionId}`;
      const response = await makeApiRequest(
        "POST",
        url,
        process.env.ELEVATE_AUTH_TOKEN,
        {
          state: "6852c86c7248c20014b38a4d",
          district: "6852c8ae7248c20014b38a57",
          block: "6852c8de7248c20014b38a9d",
          cluster: "6852c9027248c20014b38c34",
          professional_role: "6825950197b5680013e6a17c",
          professional_subroles:
            "6825ad1f97b5680013e844fa,6825ad1f97b5680013e844fb",
          organizations: "[object Object]",
        }
      );

      return response?.data?.result || response?.data || null;
    } catch (error) {
      Logger.error("Error fetching solution from API", {
        solutionId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * ============================================
   * PROJECT MANAGEMENT FLOWS
   * ============================================
   */

  async startNewProjectFlow(phoneNumber) {
    try {
      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "project_creation",
        step: 1,
        context: {},
        text: "start_new_project",
      });

      await whatsappService.sendMessage(
        phoneNumber,
        "🎯 *Let's create a new project!*\n\n" +
          "Please enter the *project name*:\n\n" +
          "_(Type 'cancel' anytime to exit)_"
      );

      Logger.info("Started project creation flow", { phoneNumber });
    } catch (error) {
      Logger.error("Error starting project flow", error);
      throw error;
    }
  }

  async handleProjectBrowseFlow(phoneNumber, messageText, lastMessage) {
    try {
      const step = lastMessage.step || 1;
      const context = lastMessage.context || {};

      if (step === 1 && /^\d+$/.test(messageText.trim())) {
        const projectNumber = parseInt(messageText.trim());
        const projectKey = `project_${projectNumber}`;
        const projectId = context.projectMap?.[projectKey];

        if (!projectId) {
          await whatsappService.sendMessage(
            phoneNumber,
            `❌ Invalid project number. Please select between 1-${
              context.totalProjects || 5
            }.`
          );
          return;
        }

        await this.showProjectDetails(phoneNumber, {
          reply: { list_reply: { id: projectId } },
        });
        return;
      }

      await whatsappService.sendMessage(
        phoneNumber,
        "Please enter a valid project number or use the navigation buttons."
      );
    } catch (error) {
      Logger.error("Error in project browse flow", error);
      await usersQueries.clearLastMessage(phoneNumber);
      throw error;
    }
  }

  async showProjectDetails(phoneNumber, message) {
    try {
      let projectId, solutionId, projectType;

      let selectedId;
      if (message.reply?.list_reply?.id) {
        selectedId = message.reply.list_reply.id;
      } else if (message.interactive?.list_reply?.id) {
        selectedId = message.interactive.list_reply.id;
      }

      if (!selectedId) {
        await whatsappService.sendMessage(
          phoneNumber,
          `❌ Invalid project selection. Please try again.`
        );
        await this.listProjects(phoneNumber, 1);
        return;
      }

      const cleanId = selectedId.replace(/^ListV3:/, "");
      const [type, id] = cleanId.split("_");

      projectType = type;
      projectId = projectType === "solutionWithProject" ? id : null;
      solutionId = projectType === "solutionWithoutProject" ? id : null;

      Logger.info("Project selected", {
        phoneNumber,
        projectId,
        solutionId,
        projectType,
      });

      // Get project data from multiple sources
      const projectDataResult = await this.getProjectData(
        phoneNumber,
        projectId,
        solutionId
      );

      const project = projectDataResult?.project;

      if (!project) {
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ Failed to load project details. Please try again."
        );
        await this.listProjects(phoneNumber, 1);
        return;
      }

      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "project_detail",
        step: 0,
        context: {
          projectId,
          solutionId,
          project,
          projectType: projectDataResult?.projectType || projectType,
        },
        text: `view_project_${projectId || solutionId}`,
      });

      await this.showProjectDetailsFromData(
        phoneNumber,
        project,
        projectType,
        projectId,
        solutionId
      );

      Logger.info("Project details shown", { phoneNumber, projectId });
    } catch (error) {
      Logger.error("Error showing project details", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Something went wrong. Showing your projects again..."
      );
      await this.listProjects(phoneNumber, 1);
    }
  }

  async handleBackToList(phoneNumber) {
    try {
      await usersQueries.clearLastMessage(phoneNumber);
      await this.listProjects(phoneNumber, 1);
    } catch (error) {
      Logger.error("Error going back to list", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Failed to load projects list."
      );
    }
  }

  async handleProjectCreationFlow(phoneNumber, messageText, lastMessage) {
    try {
      const step = lastMessage.step || 1;
      const context = lastMessage.context || {};

      switch (step) {
        case 1:
          context.projectName = messageText.trim();
          await usersQueries.updateLastMessage(phoneNumber, {
            flow: "project_creation",
            step: 2,
            context,
            text: messageText,
          });
          await whatsappService.sendMessage(
            phoneNumber,
            `✅ Great! Project name: *${context.projectName}*\n\n` +
              "Now, please provide a *description* for your project:"
          );
          break;

        case 2:
          context.projectDescription = messageText.trim();
          await usersQueries.updateLastMessage(phoneNumber, {
            flow: "project_creation",
            step: 3,
            context,
            text: messageText,
          });
          await whatsappService.sendMessage(
            phoneNumber,
            "📅 When does the project start?\n\n" +
              "Please provide the date in format: *DD/MM/YYYY*"
          );
          break;

        case 3:
          if (!/^\d{2}\/\d{2}\/\d{4}$/.test(messageText)) {
            await whatsappService.sendMessage(
              phoneNumber,
              "❌ Invalid date format. Please use *DD/MM/YYYY*"
            );
            return;
          }
          context.startDate = messageText.trim();
          await usersQueries.updateLastMessage(phoneNumber, {
            flow: "project_creation",
            step: 4,
            context,
            text: messageText,
          });
          await whatsappService.sendInteractiveMessage({
            to: phoneNumber,
            type: "button",
            body: {
              text:
                "📋 *Project Summary*\n\n" +
                `*Name:* ${context.projectName}\n` +
                `*Description:* ${context.projectDescription}\n` +
                `*Start Date:* ${context.startDate}\n\n` +
                "Is this correct?",
            },
            action: {
              buttons: [
                {
                  type: "reply",
                  reply: { id: "confirm_project", title: "✅ Confirm" },
                },
                {
                  type: "reply",
                  reply: { id: "cancel_project", title: "❌ Cancel" },
                },
              ],
            },
          });
          break;

        default:
          await usersQueries.clearLastMessage(phoneNumber);
          break;
      }
    } catch (error) {
      Logger.error("Error in project creation flow", error);
      await usersQueries.clearLastMessage(phoneNumber);
      throw error;
    }
  }

  async listProjects(phoneNumber, page = 1) {
    try {
      const url = `${this.apiBaseUrl}/project/v1/solutions/targetedSolutions?type=improvementProject&page=1&limit=30&filter=assignedToMe`;

      const response = await makeApiRequest(
        "POST",
        url,
        process.env.ELEVATE_AUTH_TOKEN,
        {
          state: "6852c86c7248c20014b38a4d",
          district: "6852c8ae7248c20014b38a57",
          block: "6852c8de7248c20014b38a9d",
          cluster: "6852c9027248c20014b38c34",
          professional_role: "6825950197b5680013e6a17c",
          professional_subroles:
            "6825ad1f97b5680013e844fa,6825ad1f97b5680013e844fb,6825ad1f97b5680013e844fe,6825ad1f97b5680013e84500",
          organizations: "[object Object]",
        }
      );

      const projects = response?.data?.result?.data || [];
      const itemsPerPage = 10;
      const totalPages = Math.ceil(projects.length / itemsPerPage);
      const start = (page - 1) * itemsPerPage;
      const paginatedProjects = projects.slice(start, start + itemsPerPage);

      if (paginatedProjects.length === 0) {
        await whatsappService.sendMessage(
          phoneNumber,
          "📂 You don't have any projects yet."
        );
        await usersQueries.clearLastMessage(phoneNumber);
        return;
      }

      const listItems = paginatedProjects.map((project) => {
        const hasProjectId = project?._id && project._id.trim() !== "";
        const projectId = hasProjectId ? project._id : project?.solutionId;
        const type = hasProjectId
          ? "solutionWithProject"
          : "solutionWithoutProject";

        return {
          id: `${type}_${projectId}`,
          title: project.name,
          description: `Status: ${project.status || "N/A"}`,
        };
      });

      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "project_browse",
        step: 1,
        text: "list_projects",
      });

      const listPayload = {
        to: `${phoneNumber}@s.whatsapp.net`,
        type: "list",
        header: { text: "Available Projects" },
        body: {
          text: `📋 *Your Projects* (Page ${page}/${totalPages})\n\nSelect a project:`,
        },
        footer: { text: "Powered by ShikshaLokam" },
        action: {
          list: {
            label: "View Projects",
            sections: [{ title: "Projects", rows: listItems }],
          },
        },
      };

      await whatsappService.sendInteractiveMessage(listPayload);

      Logger.info("Listed projects", { phoneNumber, page, totalPages });
    } catch (error) {
      Logger.error("Error listing projects", error);
      throw error;
    }
  }

  async searchProjectByName(phoneNumber, projectName, getTask = false) {
    try {
      Logger.info("Searching for project by name", {
        phoneNumber,
        projectName,
      });

      const url = `${
        this.apiBaseUrl
      }/project/v1/solutions/targetedSolutions?type=improvementProject&page=1&limit=10&filter=assignedToMe&search=${encodeURIComponent(
        projectName
      )}`;

      const response = await makeApiRequest(
        "POST",
        url,
        process.env.ELEVATE_AUTH_TOKEN,
        {
          state: "6852c86c7248c20014b38a4d",
          district: "6852c8ae7248c20014b38a57",
          block: "6852c8de7248c20014b38a9d",
          cluster: "6852c9027248c20014b38c34",
          professional_role: "6825950197b5680013e6a17c",
          professional_subroles:
            "6825ad1f97b5680013e844fa,6825ad1f97b5680013e844fb",
          organizations: "[object Object]",
        }
      );

      const projects = response?.data?.result?.data || [];

      if (projects.length === 0) {
        await whatsappService.sendMessage(
          phoneNumber,
          `❌ No project found with name: "${projectName}"`
        );
        return { success: false, message: "No projects found" };
      }

      if (projects.length === 1) {
        return await this.handleSingleProjectFound(
          phoneNumber,
          projects[0],
          projectName,
          getTask
        );
      }

      await this.showProjectSelectionList(phoneNumber, projects, projectName);

      return {
        success: true,
        multipleMatches: true,
        matchCount: projects.length,
      };
    } catch (error) {
      Logger.error("Error searching project by name", error);
      throw error;
    }
  }

  async handleSingleProjectFound(phoneNumber, project, projectName, getTask) {
    try {
      const hasProjectId = project?._id && project._id.trim() !== "";
      const projectId = hasProjectId ? project._id : null;
      const solutionId = project.solutionId;
      const projectType = hasProjectId
        ? "solutionWithProject"
        : "solutionWithoutProject";

      const projectDataResult = await this.getProjectData(
        phoneNumber,
        projectId,
        solutionId
      );

      const fullProjectData = projectDataResult?.project || project;

      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "project_detail",
        step: 0,
        context: {
          projectId,
          solutionId,
          project: fullProjectData,
          projectType: projectDataResult?.projectType || projectType,
        },
        text: `view_project_${projectId || solutionId}`,
      });

      let projectData = await this.showProjectDetailsFromData(
        phoneNumber,
        fullProjectData,
        projectType,
        projectId,
        solutionId,
        getTask //getTasl
      );

      return {
        success: true,
        projectFound: true,
        projectId,
        solutionId,
        projectType,
        projectData,
      };
    } catch (error) {
      Logger.error("Error handling single project found", error);
      throw error;
    }
  }

  async showProjectDetailsFromData(
    phoneNumber,
    project,
    projectType,
    projectId,
    solutionId,
    getTask = false
  ) {
    try {
      let fullProject = project;

      // Fetch full details if needed
      const url =
        projectType === "solutionWithProject"
          ? `${this.apiBaseUrl}/project/v1/userProjects/details/${projectId}`
          : `${this.apiBaseUrl}/project/v1/solutions/details/${solutionId}`;

      const response = await makeApiRequest(
        "POST",
        url,
        process.env.ELEVATE_AUTH_TOKEN,
        {
          state: "6852c86c7248c20014b38a4d",
          district: "6852c8ae7248c20014b38a57",
          block: "6852c8de7248c20014b38a9d",
          cluster: "6852c9027248c20014b38c34",
          professional_role: "6825950197b5680013e6a17c",
          professional_subroles:
            "6825ad1f97b5680013e844fa,6825ad1f97b5680013e844fb",
          organizations: "[object Object]",
        }
      );

      fullProject = response?.data?.result || response?.data || project;

      if (projectType === "solutionWithProject") {
        await this.syncProjectToDB(fullProject, phoneNumber, 1);
      }

      const detailsText =
        `*📁 ${fullProject.title ?? fullProject.name}*\n\n` +
        `${fullProject.description ? `${fullProject.description}\n\n` : ""}` +
        `*Duration:* ${fullProject.duration || "N/A"}\n` +
        `*Status:* ${fullProject.status || "Unknown"}\n\n` +
        `What would you like to do?`;

      const projectStatus = fullProject.status?.toLowerCase();
      const buttons = [];

      if (projectType === "solutionWithoutProject") {
        buttons.push(
          {
            type: "quick_reply",
            title: "🚀 Start Project",
            id: `start_improvement_${projectId || solutionId}`,
          },
          { type: "quick_reply", title: "⬅️ Back to List", id: "back_to_list" }
        );
      } else {
        if (projectStatus !== "submitted" && projectStatus !== "completed") {
          buttons.push(
            {
              type: "quick_reply",
              title: "📋 View Tasks",
              id: `view_tasks_${projectId}`,
            },
            {
              type: "quick_reply",
              title: "✏️ Update Task",
              id: `update_task_${projectId}`,
            }
          );
        }

        if (projectStatus === "submitted" || projectStatus === "completed") {
          buttons.push({
            type: "quick_reply",
            title: "📊 View Report",
            id: `view_report_${projectId}`,
          });
        }

        if (projectStatus === "completed") {
          buttons.push({
            type: "quick_reply",
            title: "🏆 View Certificate",
            id: `view_certificate_${projectId}`,
          });
        }

        buttons.push({
          type: "quick_reply",
          title: "⬅️ Back to List",
          id: "back_to_list",
        });
      }

      const displayButtons = buttons.slice(0, 3);

      if (!getTask) {
        await whatsappService.sendInteractiveMessage({
          to: phoneNumber,
          type: "button",
          header: { text: "Project Details" },
          body: { text: detailsText },
          footer: { text: "Powered by ShikshaLokam" },
          action: { buttons: displayButtons },
        });
      } else {
        return fullProject;
      }

      Logger.info("Project details shown", { phoneNumber, projectId });
    } catch (error) {
      Logger.error("Error showing project details from data", error);
      throw error;
    }
  }

  async showProjectSelectionList(phoneNumber, projects, searchTerm) {
    try {
      const listItems = projects.map((project) => {
        const hasProjectId = project?._id && project._id.trim() !== "";
        const projectId = hasProjectId ? project._id : project?.solutionId;
        const type = hasProjectId
          ? "solutionWithProject"
          : "solutionWithoutProject";

        return {
          id: `${type}_${projectId}`,
          title: project.name,
          description: `Status: ${project.status || "N/A"}`,
        };
      });

      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "project_browse",
        step: 1,
        context: { searchTerm, action: "search_results" },
        text: `search_results_${searchTerm}`,
      });

      const listPayload = {
        to: `${phoneNumber}@s.whatsapp.net`,
        type: "list",
        header: { text: "Multiple Projects Found" },
        body: {
          text: `🔍 Found ${projects.length} projects matching "${searchTerm}"\n\nSelect one:`,
        },
        footer: { text: "Powered by ShikshaLokam" },
        action: {
          list: {
            label: "Select Project",
            sections: [{ title: "Matching Projects", rows: listItems }],
          },
        },
      };

      await whatsappService.sendInteractiveMessage(listPayload);

      Logger.info("Project selection list sent", {
        phoneNumber,
        projectCount: projects.length,
      });
    } catch (error) {
      Logger.error("Error showing project selection list", error);
      throw error;
    }
  }

  async handleProjectUpdateFlow(phoneNumber, messageText, lastMessage) {
    try {
      Logger.info("Project update flow", { phoneNumber });
      // Add your update logic here
    } catch (error) {
      Logger.error("Error in project update flow", error);
      throw error;
    }
  }

  async handleInteractiveResponse(phoneNumber, action) {
    try {
      if (action === "confirm_project") {
        const lastMessage = await usersQueries.getLastMessage(phoneNumber);
        const projectData = lastMessage.context;

        await whatsappService.sendMessage(
          phoneNumber,
          "🎉 *Project created successfully!*\n\n" +
            `Project: ${projectData.projectName}`
        );

        await usersQueries.clearLastMessage(phoneNumber);
        return;
      }

      if (action === "cancel_project") {
        await usersQueries.clearLastMessage(phoneNumber);
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ Project creation cancelled."
        );
        return;
      }

      if (/^next_page_(\d+)$/.test(action)) {
        const page = parseInt(action.match(/\d+/)[0]);
        await this.listProjects(phoneNumber, page);
        return;
      }

      if (/^prev_page_(\d+)$/.test(action)) {
        const page = parseInt(action.match(/\d+/)[0]);
        await this.listProjects(phoneNumber, page);
        return;
      }
    } catch (error) {
      Logger.error("Error handling interactive response", error);
      throw error;
    }
  }

  async handleStartImprovementProject(phoneNumber, solutionId, projectData) {
    try {
      Logger.info("Starting improvement project", { phoneNumber, solutionId });

      const templateId = projectData.externalId;
      const url = `${this.apiBaseUrl}/project/v1/userProjects/details?solutionId=${solutionId}&templateId=${templateId}`;

      const response = await makeApiRequest(
        "POST",
        url,
        process.env.ELEVATE_AUTH_TOKEN,
        {
          state: "6852c86c7248c20014b38a4d",
          district: "6852c8ae7248c20014b38a57",
          block: "6852c8de7248c20014b38a9d",
          cluster: "6852c9027248c20014b38c34",
          professional_role: "6825950197b5680013e6a17c",
          professional_subroles:
            "6825ad1f97b5680013e844fa,6825ad1f97b5680013e844fb",
          organizations: "[object Object]",
        }
      );

      const improvementProject = response?.data?.result;

      if (!improvementProject) {
        throw new Error("Failed to fetch improvement project");
      }

      await this.syncProjectToDB(improvementProject, phoneNumber, 1);

      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "improvement_project",
        step: 0,
        context: { projectData: improvementProject, solutionId, templateId },
        text: "view_improvement_project",
      });

      await taskService.showTasksMenu(phoneNumber, improvementProject);
    } catch (error) {
      Logger.error("Error starting improvement project", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error loading project. Please try again."
      );
    }
  }

  async handleProjectPagination(phoneNumber, action) {
    try {
      let page = 1;

      if (action.startsWith("next_projects_")) {
        page = parseInt(action.replace("next_projects_", ""));
      } else if (action.startsWith("prev_projects_")) {
        page = parseInt(action.replace("prev_projects_", ""));
      }

      if (isNaN(page) || page < 1) page = 1;

      await this.listProjects(phoneNumber, page);
    } catch (error) {
      Logger.error("Error handling project pagination", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error loading projects. Please try again."
      );
    }
  }

  async syncProjectToDB(projectData, userPhone, userId) {
    const projectId = projectData._id;
    
    // Map tasks including type in storage ⚡
    const mappedTasks = (projectData.tasks || []).map((task) => ({
      taskId: task.referenceId || task._id,
      taskName: task.name,
      type: task.type || "simple", // 👈 Store type also
      status: task.status || "notStarted",
      endDate: task.updatedAt ? new Date(task.updatedAt) : null,
      ..._.omit(task, [
        "_id",
        "referenceId",
        "name",
        "type",
        "status",
        "updatedAt",
      ]),
      evidence: [],
    }));

    const payload = {
      projectId,
      projectName: projectData.title,
      solutionId: projectData.solutionId,
      programId: projectData.programId,
      phoneNumber: userPhone,
      userId: userId,
      projectData: {
        status: projectData.status,
        description: projectData.description,
        duration: projectData.duration,
        syncedAt: projectData.syncedAt,
      },
      tasks: mappedTasks,
      submissionStatus:
        projectData.status === "submitted" ? "submitted" : "draft",
      submittedAt: projectData.completedDate || null,
    };

    // 🔍 Check if project exists for user

    let result = await Project.findOne({ projectId, userId });

    if (!result) {
      result = await Project.create(payload);
    }

    return result;
  }

  /**
   * Generate and send project report
   */
  async generateProjectReport(phoneNumber, projectId) {
    try {
      Logger.info("Generating project report", { phoneNumber, projectId });

      const url = `${this.apiBaseUrl}/project/v1/userProjects/share/${projectId}`;

      const response = await makeApiRequest(
        "GET",
        url,
        process.env.ELEVATE_AUTH_TOKEN
      );
      console.log(response, "this is res");
      if (!response.success || !response.data?.result?.downloadUrl) {
        throw new Error("Failed to generate report");
      }

      const reportUrl = response.data.result.downloadUrl;

      Logger.info("Report generated successfully", { phoneNumber, reportUrl });

      // Send PDF document via WhatsApp using existing sendMediaMessage
      await whatsappService.sendMediaMessage(
        phoneNumber,
        "document",
        reportUrl,
        "📊 *Your Project Report*\n\nHere is your detailed project report."
      );

      // Send success message with option to go back
      await whatsappService.sendInteractiveMessage({
        to: phoneNumber,
        type: "button",
        body: {
          text: "✅ Report sent successfully!\n\nWhat would you like to do next?",
        },
        action: {
          buttons: [
            {
              type: "quick_reply",
              title: "⬅️ Back to Project",
              id: `back_to_project_${projectId}`,
            },
            {
              type: "quick_reply",
              title: "📋 My Projects",
              id: "back_to_list",
            },
            {
              type: "quick_reply",
              title: "🏠 Main Menu",
              id: "main_menu",
            },
          ],
        },
      });

      Logger.info("Report sent successfully", { phoneNumber, projectId });
    } catch (error) {
      Logger.error("Error generating project report", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Failed to generate report. Please try again later."
      );
    }
  }

  /**
   * Show certificate options (PDF or SVG)
   */
  async showCertificateOptions(phoneNumber, project) {
    try {
      Logger.info("Showing certificate options", {
        phoneNumber,
        projectId: project._id,
      });

      const certificate = project.certificate;

      if (!certificate || !certificate.pdfUrl || !certificate.svgUrl) {
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ Certificate not available for this project."
        );
        return;
      }

      // Store certificate URLs in context
      await usersQueries.updateLastMessage(phoneNumber, {
        flow: "certificate_selection",
        step: 1,
        context: {
          projectId: project._id,
          pdfUrl: certificate.pdfUrl,
          svgUrl: certificate.svgUrl,
          project: project,
        },
        text: "select_certificate_format",
      });

      // Send format selection buttons
      await whatsappService.sendInteractiveMessage({
        to: phoneNumber,
        type: "button",
        header: {
          text: "🏆 Certificate Available",
        },
        body: {
          text: "Your certificate is ready!\n\nPlease select your preferred format:",
        },
        footer: {
          text: "Powered by ShikshaLokam",
        },
        action: {
          buttons: [
            {
              type: "quick_reply",
              title: "📄 PDF Format",
              id: `cert_pdf_${project._id}`,
            },
            {
              type: "quick_reply",
              title: "🎨 SVG Format",
              id: `cert_svg_${project._id}`,
            },
            {
              type: "quick_reply",
              title: "⬅️ Back",
              id: `back_to_project_${project._id}`,
            },
          ],
        },
      });

      Logger.info("Certificate options shown", {
        phoneNumber,
        projectId: project._id,
      });
    } catch (error) {
      Logger.error("Error showing certificate options", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Failed to load certificate options. Please try again."
      );
    }
  }

  /**
   * Send certificate in selected format
   */
  async sendCertificate(phoneNumber, projectId, format) {
    try {
      Logger.info("Sending certificate", { phoneNumber, projectId, format });

      const lastMessage = await usersQueries.getLastMessage(phoneNumber);
      const context = lastMessage?.context || {};

      if (!context.pdfUrl || !context.svgUrl) {
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ Certificate data not found. Please try again."
        );
        return;
      }

      const url = format === "pdf" ? context.pdfUrl : context.svgUrl;
      const caption = `🏆 *Congratulations!*\n\nHere is your project completion certificate in ${format.toUpperCase()} format.`;

      // Determine media type based on format
      const mediaType = format === "pdf" ? "document" : "image"; // SVG will be sent as image

      // Send certificate using existing sendMediaMessage
      await whatsappService.sendMediaMessage(
        phoneNumber,
        mediaType,
        url,
        caption
      );

      // Clear flow state
      await usersQueries.clearLastMessage(phoneNumber);

      // Send success message with navigation
      await whatsappService.sendInteractiveMessage({
        to: phoneNumber,
        type: "button",
        body: {
          text: "✅ Certificate sent successfully!\n\nWhat would you like to do next?",
        },
        action: {
          buttons: [
            {
              type: "quick_reply",
              title: "⬅️ Back to Project",
              id: `back_to_project_${projectId}`,
            },
            {
              type: "quick_reply",
              title: "📋 My Projects",
              id: "back_to_list",
            },
            {
              type: "quick_reply",
              title: "🏠 Main Menu",
              id: "main_menu",
            },
          ],
        },
      });

      Logger.info("Certificate sent successfully", { phoneNumber, format });
    } catch (error) {
      Logger.error("Error sending certificate", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Failed to send certificate. Please try again later."
      );
    }
  }

  /**
   * Helper function to resolve project data from either projectId or projectName
   * Handles both MongoDB and API fetching with syncing
   *
   * @param {string} phoneNumber - User's phone number
   * @param {string} projectId - Project ID (optional if projectName provided)
   * @param {string} projectName - Project name (optional if projectId provided)
   * @returns {Promise<{success: boolean, projectData: object, finalProjectId: string, error?: string}>}
   */
  async resolveProject(phoneNumber, projectId, projectName) {
    try {
      if (!phoneNumber) {
        return {
          success: false,
          error: "Phone number is required",
        };
      }

      if (!projectId && !projectName) {
        return {
          success: false,
          error: "Either projectId or projectName is required",
        };
      }

      let finalProjectId = projectId;

      // If projectName provided but not projectId, search for the project first
      if (!projectId && projectName) {
        Logger.info("Resolving project by name", {
          phoneNumber,
          projectName,
        });

        const searchResult = await this.searchProjectByName(
          phoneNumber,
          projectName,
          true
        );

        if (!searchResult.success || !searchResult.projectId) {
          return {
            success: false,
            error: `Project "${projectName}" not found`,
            projectName,
          };
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
        return {
          success: false,
          error: "Project not found",
          projectId: finalProjectId,
        };
      }

      return {
        success: true,
        projectData,
        finalProjectId,
      };
    } catch (error) {
      Logger.error("Error resolving project", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Helper function to validate task parameters
   *
   * @param {string} phoneNumber - User's phone number
   * @param {number} taskIndex - Task index (1-based)
   * @param {string} status - Task status (optional, for update operations)
   * @returns {object} - Validation result with success flag and error message
   */
  async validateTaskParameters(phoneNumber, taskIndex, status = null) {
    if (!phoneNumber) {
      return {
        success: false,
        error: "Phone number is required",
      };
    }

    if (taskIndex === undefined || taskIndex === null) {
      return {
        success: false,
        error: "Task index is required",
      };
    }

    if (status) {
      const validStatuses = ["notStarted", "inProgress", "completed"];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        };
      }
    }

    return { success: true };
  }
}

module.exports = new ProjectService();
