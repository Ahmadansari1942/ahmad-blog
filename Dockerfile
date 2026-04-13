# ─────────────────────────────────────────────────────────────
# DOCKERFILE — AhmadBlog
# Yeh file Docker ko batati hai ke image kaise banani hai.
# Har instruction ek "layer" banata hai. Layers cache hoti hain —
# agar code change ho toh sirf woh layer rebuild hoti hai.
# ─────────────────────────────────────────────────────────────

# STEP 1 — Base Image
# Node.js ka official image use karo.
# "20-alpine" matlab Node.js version 20, Alpine Linux pe.
# Alpine bahut chota hai (~5MB), isliye production mein ideal hai.
FROM node:20-alpine

# STEP 2 — Working Directory
# Container ke andar /app folder banao aur usi mein kaam karo.
# Jaise aap apne PC pe ek project folder banate ho.
WORKDIR /app

# STEP 3 — Dependencies Copy
# Pehle sirf package.json copy karo (source code se pehle).
# Kyun? Docker caching ki wajah se:
# Agar sirf code change ho aur package.json na badle,
# toh "npm install" dobara nahi chalega — time bachega.
COPY package*.json ./

# STEP 4 — Install Dependencies
# npm ci = "clean install" — package-lock.json se exact versions install karta hai.
# --omit=dev = production pe dev dependencies (nodemon etc) ki zaroorat nahi.
RUN npm ci --omit=dev

# STEP 5 — Application Code Copy
# Ab poora source code copy karo container mein.
# .dockerignore file woh files skip karti hai jo nahi chahiye (node_modules, .git etc)
COPY . .

# STEP 6 — Expose Port
# Container ko batao ke yeh app port 3000 pe sunti hai.
# Sirf documentation hai — actual port mapping docker run mein hoti hai.
EXPOSE 3000

# STEP 7 — Non-root User (Security Best Practice)
# Root user ke tor pe app chalana risky hai.
# node user already alpine image mein hota hai — use karo.
USER node

# STEP 8 — Start Command
# Container start hone pe yeh command chalao.
# CMD format: ["executable", "argument"]
CMD ["node", "server.js"]
