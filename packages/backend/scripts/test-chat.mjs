import axios from "axios";

const API_URL = "http://localhost:3001";

async function testChat() {
  try {
    console.log("\n=== Test 1: Puste pytanie ===");
    try {
      await axios.post(`${API_URL}/api/chat`, {
        message: "",
      });
    } catch (error) {
      console.log("Błąd (oczekiwany):", error.response.data);
    }

    console.log("\n=== Test 2: Zbyt długie pytanie ===");
    try {
      await axios.post(`${API_URL}/api/chat`, {
        message: "a".repeat(1001),
      });
    } catch (error) {
      console.log("Błąd (oczekiwany):", error.response.data);
    }

    console.log("\n=== Test 3: Poprawne pytanie ===");
    const response = await axios.post(`${API_URL}/api/chat`, {
      message: "Jak się masz?",
    });
    console.log("Odpowiedź:", response.data);

    console.log("\n=== Test 4: Statystyki pytania ===");
    const stats = await axios.get(
      `${API_URL}/api/chat/stats?question=jak się masz`
    );
    console.log("Statystyki:", stats.data);

    console.log("\n=== Test 5: FAQ ===");
    const faq = await axios.get(`${API_URL}/api/chat/faq?limit=5`);
    console.log("FAQ:", faq.data);
  } catch (error) {
    console.error("Błąd:", error.response?.data || error.message);
  }
}

testChat();
