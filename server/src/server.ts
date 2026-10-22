import app from "./app.js";
import { getDatabaseUrl, getPort } from "./config/env.js";

getDatabaseUrl();
const port = getPort();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
