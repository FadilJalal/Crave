import "dotenv/config";
import fetch from "node-fetch";

const GROQ_KEY = process.env.GROQ_MOOD_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant";

async function testGroq() {
  console.log("Testing Groq with key:", GROQ_KEY?.slice(0, 10) + "...");
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello!" },
        ],
      }),
    });
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testGroq();
