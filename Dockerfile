# --- Stage 1: Build Application ---
   FROM node:22-alpine AS build

   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci
   
   COPY prisma ./prisma
   COPY prisma.config.ts ./
   RUN npx prisma generate
   
   COPY . .
   RUN npm run build
   
   # --- Stage 2: Final Production Runner ---
   FROM node:22-alpine AS runner
   
   WORKDIR /app
   
   ENV NODE_ENV=production
   ENV HOST=0.0.0.0
   ENV PORT=3000
   
   # 1. Copy only files needed to install production dependencies
   COPY --from=build /app/package*.json ./
   COPY --from=build /app/prisma ./prisma
   COPY --from=build /app/prisma.config.ts ./prisma.config.ts
   
   # 2. Install ONLY production dependencies (skips devDependencies)
   RUN npm ci --only=production
   
   # 3. Re-generate runtime-only Prisma client modules
   RUN npx prisma generate
   
   # 4. Copy the compiled app code and static assets
   COPY --from=build /app/dist ./dist
   COPY --from=build /app/content ./content
   # Note: Removed /app/test completely since tests aren't run in production!
   
   EXPOSE 3000
   
   CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]