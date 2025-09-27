import "dotenv/config";
import { connectDB } from "./src/config/db.js";
import app from "./src/app.js";

await connectDB();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
