# Install Supabase CLI on Windows

## Quick Install (1 minute)

**Copy and paste this command into Terminal:**

```bash
npm install -g supabase
```

**Wait for it to finish...**

You should see:
```
added XXX packages
```

---

## Verify It's Installed

**Type this:**
```bash
supabase --version
```

**You should see a version number like:**
```
supabase-cli/1.XX.XX
```

✅ If you see a version → **You're good!**

---

## Now Deploy Your Function

**Once installed, run:**

```bash
supabase functions deploy create-payment-link --project-id pnmfsenqutbsopzaatvj
```

You should see:
```
✓ Function deployed successfully
```

---

## Still Having Issues?

**Try this alternative install:**

```bash
npm install -g supabase-cli
```

Then try deploying again.

---

## For macOS/Linux Users (if needed)

```bash
brew install supabase/tap/supabase
```

---

Let me know once it's installed! 🚀
