// ============================================
// FILE: controllers/messageController.js -
// ============================================

const Logger2 = require("../utils/logger");
const flowRouter = require("../services/flowRouter");
const aiService2 = require("../services/aiService");
const whatsappService = require("../services/whatsappService");
const usersQueries = require("../database/databaseQueries/userQueries");
const Project = require("../database/models/project");
const axios = require("axios");

class MessageController {
  /**
   * Main entry point for all WhatsApp messages
   */
  static async handleWhatsAppMessage(message, phoneNumber) {
    try {

      const lastMessage = await usersQueries.getLastMessage(phoneNumber);

      // ============================================
      // STEP 1: Interactive Messages (Buttons/Lists)
      // ============================================
      if (this.isInteractiveMessage(message)) {
        Logger2.info("MessageController: Interactive → FlowRouter", {
          phoneNumber,
          action:
            message?.interactive?.buttons_reply?.id ||
            message?.interactive?.list_reply?.id,
        });
        const result = await flowRouter.route(message);
        return { ...result, route: "flowrouter-interactive" };
      }

      // ============================================
      // STEP 2: Voice/Audio Messages
      // ============================================
      if (message.type === "audio" || message.type === "voice") {
        Logger2.info("MessageController: Audio → Transcribe → NLP", {
          phoneNumber,
        });
        return await this.handleAudioMessage(message, phoneNumber);
      }

      // ============================================
      // STEP 3: Text Messages
      // ============================================
      if (message.type === "text") {
        const messageText = message.text?.body?.trim() || "";

        Logger2.info("MessageController: Text message received", {
          phoneNumber,
          text: messageText.substring(0, 50),
        });

        // Simple commands go to FlowRouter
        if (this.isSimpleCommand(messageText)) {
          Logger2.info("MessageController: Simple command → FlowRouter", {
            phoneNumber,
            command: messageText,
          });
          const result = await flowRouter.route(message);
          return { ...result, route: "flowrouter-command" };
        }

        // Task number input goes to FlowRouter
        if (this.isTaskNumberInput(messageText)) {
          Logger2.info("MessageController: Task number input → FlowRouter", {
            phoneNumber,
            taskNumber: messageText,
          });
          const result = await flowRouter.route(message);
          return { ...result, route: "flowrouter-task-number" };
        }

        // Natural language goes to Claude
        Logger2.info(
          "MessageController: Natural language → Claude (AI Service)",
          {
            phoneNumber,
            text: messageText.substring(0, 50),
          }
        );
        return await this.handleNaturalLanguage(
          message,
          phoneNumber,
          messageText
        );
      }

      // ============================================
      // STEP 4: Media (Evidence Upload)
      // ============================================
      if (
        (message.type === "image" || message.type === "document") &&
        lastMessage?.context?.uploadingEvidence
      ) {
        Logger2.info("MessageController: Media → FlowRouter (Evidence)", {
          phoneNumber,
          type: message.type,
        });
        const result = await flowRouter.route(message);
        return { ...result, route: "flowrouter-media" };
      } else {

        // await whatsappService.sendMessage(
        //   phoneNumber,
        //   `📁 To upload this as evidence, please provide:\n\n` +
        //     `Project Name: (e.g., "Q4 Project")\n` +
        //     `Task Number: (e.g., "1")\n\n` +
        //     `Send like: "Q4 Project task 1" or "project Q4 1"`
        // );

        await whatsappService.sendMessage(
          phoneNumber,
          `📎 *UPLOAD EVIDENCE*\n\n` +
            `Please reply with your project and task details:\n\n` +
            `*Format:*\n` +
            `"[Project Name] task [Number]"\n\n` +
            `*Examples:*\n` +
            `✓ Q4 Project task 1\n` +
            `✓ Regression Testing task 3\n` +
            `✓ Q1 Sprint task 5\n\n` +
            `📌 You can also reply:\n` +
            `• "project Q4 task 1"\n` +
            `• "Upload to Q4 1"`
        );

       
  
        // Set context for next message
        await usersQueries.updateLastMessage(phoneNumber, {
          flow: "process_evidence_upload",
          step: 0,
          context: {
            ...lastMessage?.context,
            pendingMedia: {
              type: message.type,
              id: message[message.type]?.id,
              link: message[message.type]?.link,
            },
          },
          text: "awaiting_evidence_context",
        });
  
        return { handled: true, route: "evidence-ask-context" };
      }

      // Fallback
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Sorry, I can only handle text, voice, images, and interactive messages."
      );
      return { success: false, handled: true, route: "unsupported" };
    } catch (error) {
      Logger2.error("MessageController: Fatal error", error);
      return {
        success: false,
        handled: false,
        error: error.message,
        route: "error",
      };
    }
  }

  // ============================================
  // ADD THESE 5 HELPER METHODS TO MessageController CLASS
  // (After handleWhatsAppMessage method)
  // ============================================

  // 4 small helper methods
  static isMediaMessage(message) {
    return ["image", "document", "video", "audio"].includes(message.type);
  }

  static isInteractiveMessage(message) {
    return !!(
      message?.interactive?.buttons_reply?.id ||
      message?.interactive?.list_reply?.id
    );
  }

  static isSimpleCommand(text) {
    return /^(projects|help|menu|cancel|exit|stop|quit|done|hi|hello)$/i.test(
      text
    );
  }

  static isTaskNumberInput(text) {
    return /^\d+$/.test(text);
  }

  /**
   * Check if message is interactive (buttons/lists)
   */
  static isInteractiveMessage(message) {
    return !!(
      message?.interactive?.buttons_reply?.id ||
      message?.reply?.buttons_reply?.id ||
      message?.buttons_reply?.id ||
      message?.interactive?.list_reply?.id ||
      message?.reply?.list_reply?.id ||
      message?.list_reply?.id
    );
  }

  /**
   * Check if text is a simple command
   */
  static isSimpleCommand(text) {
    const simpleCommands =
      /^(projects|help|menu|cancel|exit|stop|quit|done|finish|complete|next|mainmenu|hi|hello)$/i;
    return simpleCommands.test(text);
  }

  /**
   * Check if text is just a task number
   */
  static isTaskNumberInput(text) {
    return /^\d+$/.test(text);
  }

  /**
   * Handle Audio/Voice Message
   */
  static async handleAudioMessage(message, phoneNumber) {
    try {
      Logger2.info("MessageController: Processing audio message", {
        phoneNumber,
      });

      // Acknowledge to user
      await whatsappService.sendMessage(
        phoneNumber,
        "🎤 Processing your voice message..."
      );

      // Download audio
      const audioBuffer = await this.downloadWhatsAppAudio(message);

      if (!audioBuffer) {
        Logger2.warn("MessageController: Failed to download audio", {
          phoneNumber,
        });
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ Failed to download voice message. Please try again or type your message."
        );
        return { success: false, handled: true, route: "audio-failed" };
      }

      // Transcribe
      const transcription = await aiService2.transcribeVoice(
        audioBuffer,
        "audio/ogg"
      );

      if (!transcription.success || !transcription.text) {
        Logger2.warn("MessageController: Transcription failed", {
          phoneNumber,
        });
        await whatsappService.sendMessage(
          phoneNumber,
          "❌ Could not understand your voice message. Please try again or type your message."
        );
        return { success: false, handled: true, route: "transcription-failed" };
      }

      const transcribedText = transcription.text.trim();

      Logger2.info("MessageController: Voice transcribed successfully", {
        phoneNumber,
        text: transcribedText.substring(0, 100),
      });

      // Show transcription
      await whatsappService.sendMessage(
        phoneNumber,
        `📝 *You said:*\n"${transcribedText}"\n\n⏳ Processing...`
      );

      // Process as natural language
      return await this.handleNaturalLanguage(
        message,
        phoneNumber,
        transcribedText
      );
    } catch (error) {
      Logger2.error("MessageController: Error processing audio", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ Error processing voice message. Please try typing instead."
      );
      return { success: false, handled: true, route: "audio-error" };
    }
  }

  /**
   * Handle Natural Language Text
   */
  static async handleNaturalLanguage(message, phoneNumber, messageText) {
    try {
      Logger2.info("MessageController: Processing natural language", {
        phoneNumber,
        text: messageText.substring(0, 50),
      });

      // Build user context for Claude
      const userContext = await this.buildUserContext(phoneNumber);

      Logger2.info("MessageController: User context built", {
        phoneNumber,
        projectCount: userContext.projectCount,
        hasCurrentProject: !!userContext.currentProject,
      });

      // Call Claude
      const intent = await aiService2.analyzeUserIntent(
        messageText,
        userContext,
        []
      );

      Logger2.info("MessageController: Intent analyzed by Claude", {
        phoneNumber,
        intent: intent.intent,
        confidence: intent.confidence,
      });

      // ============================================
      // NEW: CHECK FOR AMBIGUOUS PROJECT INTENT
      // ============================================
      if (intent.intent === "execute_tools" && intent.toolCalls?.length > 0) {
        const toolCall = intent.toolCalls[0];

        // Check if this is a task listing request with an ambiguous project
        if (
          toolCall.name === "list_project_tasks" &&
          !toolCall.input.projectId &&
          toolCall.input.projectName
        ) {
          Logger2.info(
            "MessageController: Ambiguous project detected - requesting clarification",
            {
              phoneNumber,
              potentialProjectName: toolCall.input.projectName,
              availableProjects: userContext.projects.map((p) => p.projectName),
            }
          );

          // Check if the projectName matches any existing project
          const matchedProject = userContext.projects.find(
            (p) =>
              p.projectName.toLowerCase() ===
              toolCall.input.projectName.toLowerCase()
          );

          if (!matchedProject) {
            // Project doesn't match - ask for clarification
            const projectList = userContext.projects
              .map((p, idx) => `${idx + 1}. ${p.projectName}`)
              .join("\n");

            const clarificationMsg =
              `❓ I'm not sure which project you mean.\n\n` +
              `Did you mean "*${toolCall.input.projectName}*"?\n\n` +
              `Or perhaps one of these:\n${projectList}\n\n` +
              `Please type the project name or number.`;

            Logger2.info(
              "MessageController: Sending clarification for ambiguous project",
              {
                phoneNumber,
                clarificationSent: true,
              }
            );

            await whatsappService.sendMessage(phoneNumber, clarificationMsg);
            return {
              success: true,
              handled: true,
              route: "nlp-clarification-ambiguous-project",
              requiresClarification: true,
            };
          }
        }
      }

      // Check if Claude wants to execute tools
      if (intent.intent === "execute_tools" && intent.toolCalls?.length > 0) {
        for (const toolCall of intent.toolCalls) {
          // ✅ Execute the tool
          const result = await aiService2.callMCPTool(
            toolCall.name,
            toolCall.input,
            phoneNumber
          );

          Logger2.debug("MessageController: Tool executed", {
            tool: toolCall.name,
            success: !result.isError,
          });
        }
      }

      // Handle low confidence
      if (intent.needsClarification || intent.confidence < 0.6) {
        const clarificationMsg =
          intent.clarificationQuestion ||
          "🤔 I'm not sure I understood. Could you be more specific?\n\nTry:\n• 'Show tasks'\n• 'Task 1 details'\n• 'Mark task 2 done'";

        Logger2.info(
          "MessageController: Low confidence, asking for clarification",
          {
            phoneNumber,
            confidence: intent.confidence,
          }
        );

        await whatsappService.sendMessage(phoneNumber, clarificationMsg);
        return { success: true, handled: true, route: "nlp-clarification" };
      }

      Logger2.info("MessageController: Intent executed successfully", {
        phoneNumber,
        intent: intent.intent,
        confidence: intent.confidence,
      });

      return {
        success: true,
        handled: true,
        route: "nlp-success",
        intent: intent.intent,
        confidence: intent.confidence,
      };
    } catch (error) {
      Logger2.error("MessageController: NLP error", error);
      await whatsappService.sendMessage(
        phoneNumber,
        "I encountered an error. Type 'menu' for options."
      );
      return { success: false, handled: true, route: "nlp-error" };
    }
  }

  /**
   * Build context for Claude understanding
   */
  static async buildUserContext(phoneNumber) {
    try {
      const lastMessage = await usersQueries.getLastMessage(phoneNumber);
      const user = await usersQueries.findUserByPhone(phoneNumber);

      const userProjects = await Project.find(
        { phoneNumber },
        { projectId: 1, projectName: 1, tasks: 1, submissionStatus: 1 }
      ).lean();

      const currentProjectId = lastMessage?.context?.projectId;
      const currentProject = currentProjectId
        ? userProjects.find((p) => p.projectId === currentProjectId)
        : null;

      const context = {
        phoneNumber,
        userName: user?.name,
        currentFlow: lastMessage?.flow,
        currentStep: lastMessage?.step,
        currentContext: lastMessage?.context,
        currentProject: currentProject || null,
        projects: userProjects,
        projectCount: userProjects.length,
        taskCounts: userProjects.map((p) => ({
          projectName: p.projectName,
          taskCount: p.tasks?.length || 0,
        })),
      };

      Logger2.debug("MessageController: Context details", {
        phoneNumber,
        currentProjectName: currentProject?.projectName || "none",
        totalProjects: userProjects.length,
      });

      return context;
    } catch (error) {
      Logger2.error("MessageController: Error building context", error);
      return { phoneNumber };
    }
  }

  /**
   * Download audio from WhatsApp
   */
  static async downloadWhatsAppAudio(message) {
    try {
      const audioId = message.audio?.id || message.voice?.id;

      if (!audioId) {
        Logger2.error("MessageController: No audio ID found", {
          messageType: message.type,
        });
        return null;
      }

      Logger2.info("MessageController: Downloading WhatsApp audio", {
        audioId,
      });

      const config = require("../config/config");

      // Get media URL
      const mediaInfoResponse = await axios.get(
        `${config.whapi.baseUrl}/media/${audioId}`,
        {
          headers: {
            Authorization: `Bearer ${config.whapi.token}`,
          },
          timeout: 15000,
        }
      );

      const mediaUrl =
        mediaInfoResponse.data.url ||
        mediaInfoResponse.data.link ||
        mediaInfoResponse.data.media?.url;

      if (!mediaUrl) {
        Logger2.error("MessageController: No media URL in response", {
          response: JSON.stringify(mediaInfoResponse.data).substring(0, 100),
        });
        return null;
      }

      Logger2.info("MessageController: Media URL obtained", {
        url: mediaUrl.substring(0, 50),
      });

      // Download audio file
      const audioResponse = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
        headers: {
          Authorization: `Bearer ${config.whapi.token}`,
        },
        timeout: 30000,
      });

      const buffer = Buffer.from(audioResponse.data);

      Logger2.info("MessageController: Audio downloaded successfully", {
        size: buffer.length,
      });

      return buffer;
    } catch (error) {
      Logger2.error("MessageController: Error downloading WhatsApp audio", {
        message: error.message,
      });
      return null;
    }
  }
}

module.exports = MessageController;
