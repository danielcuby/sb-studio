// Makes someone an admin of the booking dashboard (/admin).
// Usage: npm run admin:add                      (asks for email and password; the password is hidden)
//    or: npm run admin:add -- you@example.com "a-long-password"
// - Creates the Supabase Auth user if it doesn't exist yet (with that password), then adds them to `admins`.
// - Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. Runs on your computer only.
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => rl.output.write(s.startsWith(question) ? s : s.includes("\n") ? "\n" : "*");
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

let [email, password] = process.argv.slice(2);
if (!email) {
  email = await ask("Shlomo's email: ");
  password = await ask("Password (at least 10 characters, hidden): ", { hidden: true });
  if (password && (await ask("Type the password again: ", { hidden: true })) !== password) {
    console.error("The passwords don't match. Run it again.");
    process.exit(1);
  }
}
if (!email) {
  console.error('Usage: npm run admin:add -- you@example.com "a-long-password"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false } });

async function findUser(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit || data.users.length < 200) return hit;
  }
}

let user = await findUser(email);
if (!user) {
  if (!password || password.length < 10) {
    console.error("New admin: give a password of at least 10 characters as the second argument.");
    process.exit(1);
  }
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  user = data.user;
  console.log(`Created user ${email}`);
} else if (password) {
  const { error } = await db.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
  console.log(`Updated password for ${email}`);
}

const { error } = await db.from("admins").upsert({ user_id: user.id });
if (error) throw error;
console.log(`${email} is now an admin. Sign in at /admin.`);
