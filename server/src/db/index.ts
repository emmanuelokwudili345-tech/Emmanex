import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "../config/env.js";

const sql = neon(getDatabaseUrl());

export const db = drizzle({ client: sql });
