import { MongoClient } from "mongodb";
import "dotenv/config";

const mongoClient = new MongoClient(
  process.env.DB_URI || "mongodb://localhost:27017"
);

async function removeDuplicates() {
  try {
    await mongoClient.connect();
    const db = mongoClient.db("chatbot");
    const bannedWordsCollection = db.collection("banned_words");

    console.log("\n=== USUWANIE DUPLIKATÓW ===");

    // Pobierz wszystkie słowa
    const words = await bannedWordsCollection.find({}).toArray();
    console.log(`Znaleziono ${words.length} słów w bazie.`);

    // Znajdź duplikaty (ignorując wielkość liter)
    const uniqueWords = new Map();
    const duplicates = [];

    words.forEach((item) => {
      const lowercaseWord = item.word.toLowerCase();
      if (uniqueWords.has(lowercaseWord)) {
        duplicates.push(item._id);
      } else {
        uniqueWords.set(lowercaseWord, item._id);
      }
    });

    if (duplicates.length > 0) {
      // Usuń duplikaty
      const result = await bannedWordsCollection.deleteMany({
        _id: { $in: duplicates },
      });

      console.log(`✅ Usunięto ${result.deletedCount} duplikatów.`);
      console.log(`✅ Pozostało ${uniqueWords.size} unikalnych słów.`);
    } else {
      console.log("✅ Nie znaleziono żadnych duplikatów.");
    }

    // Pokaż aktualną listę
    const finalWords = await bannedWordsCollection.find({}).toArray();
    console.log("\n=== AKTUALNA LISTA SŁÓW ===");
    finalWords.forEach((item, index) => {
      console.log(`${index + 1}. ${item.word}`);
    });
    console.log("==========================\n");
  } catch (error) {
    console.error("❌ Błąd podczas usuwania duplikatów:", error);
  } finally {
    await mongoClient.close();
  }
}

// Uruchom skrypt
console.log("Rozpoczynam usuwanie duplikatów z bazy...");
removeDuplicates();
