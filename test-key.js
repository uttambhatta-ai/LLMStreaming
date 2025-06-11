import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyCD95_MIFyvJQLeEFyWmrSJITQe-D2yyjs' });


async function testKey1() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Explain how AI works in a few words",
    });
    console.log("Response:", response.text);
  } catch (error) {
    console.error("API key test failed:", error);
  }
}

testKey1();

// testKey();