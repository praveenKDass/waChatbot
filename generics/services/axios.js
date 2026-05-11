const axios = require("axios");

/**
 * Generic function for making API calls
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} url - API endpoint
 * @param {object} headers - Request headers
 * @param {object} body - Request payload (for POST/PUT)
 * @returns {Promise<object>}
 */

async function makeApiRequest(method, url, token, body = {}) {
  try {
    console.log(method,url, "this is token");
    const headers = {
      "Content-Type": "application/json",
      "x-auth-token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoxODMzLCJuYW1lIjoidXNlciBmdW5jdGlvbmFyaWVzb2ZmaWNpYWxzIiwic2Vzc2lvbl9pZCI6MzI3NTksIm9yZ2FuaXphdGlvbl9pZHMiOlsiMzMiXSwib3JnYW5pemF0aW9uX2NvZGVzIjpbInRhbjkwIl0sInRlbmFudF9jb2RlIjoic2hpa3NoYWxva2FtIiwib3JnYW5pemF0aW9ucyI6W3siaWQiOjMzLCJuYW1lIjoidGFuOTAiLCJjb2RlIjoidGFuOTAiLCJkZXNjcmlwdGlvbiI6IlRhbjkwIHNwZWNpYWxpemVzIGluIHByb3ZpZGluZyBlZHVjYXRpb25hbCBTVEVBTSIsInN0YXR1cyI6IkFDVElWRSIsInJlbGF0ZWRfb3JncyI6WzM0XSwidGVuYW50X2NvZGUiOiJzaGlrc2hhbG9rYW0iLCJtZXRhIjpudWxsLCJjcmVhdGVkX2J5IjoxLCJ1cGRhdGVkX2J5IjoxNzA5LCJyb2xlcyI6W3siaWQiOjIzLCJ0aXRsZSI6Im1lbnRlZSIsImxhYmVsIjoibWVudGVlIiwidXNlcl90eXBlIjowLCJzdGF0dXMiOiJBQ1RJVkUiLCJvcmdhbml6YXRpb25faWQiOjEwLCJ2aXNpYmlsaXR5IjoiUFVCTElDIiwidGVuYW50X2NvZGUiOiJzaGlrc2hhbG9rYW0iLCJ0cmFuc2xhdGlvbnMiOm51bGx9LHsiaWQiOjQxLCJ0aXRsZSI6ImxlYXJuZXIiLCJsYWJlbCI6IkxlYXJuZXIiLCJ1c2VyX3R5cGUiOjAsInN0YXR1cyI6IkFDVElWRSIsIm9yZ2FuaXphdGlvbl9pZCI6MTAsInZpc2liaWxpdHkiOiJQVUJMSUMiLCJ0ZW5hbnRfY29kZSI6InNoaWtzaGFsb2thbSIsInRyYW5zbGF0aW9ucyI6bnVsbH1dfV19LCJpYXQiOjE3NzIxNzE1ODksImV4cCI6MTc3MjI1Nzk4OX0.7EGatTH07lp305sdIS4sYfq9Gnx_TcFXEGCF6jWzUzs",
    };

    if(method.toUpperCase() == "GET"){
      headers["x-app-ver"]=""
    }

    const options = {
      method,
      url,
      headers,
    };

    if (method.toUpperCase() !== "GET") {
      options.data = body;
    }

    console.log("Request Options:", JSON.stringify(options, null, 2));
    
    const response = await axios(options);

    console.log("Response:", response.data);

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error(
      `API request failed [${method}] ${url}`,
      error.response?.data || error.message
    );
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message,
    };
  }
}

async function downloadBinaryFile(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message,
    };
  }
}

module.exports = { makeApiRequest, downloadBinaryFile };
