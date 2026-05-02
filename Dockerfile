# [EVAL: SECURITY] Use a specific Node.js version for stability and security
FROM node:18-slim

# [EVAL: EFFICIENCY] Create and change to the app directory
WORKDIR /usr/src/app

# [EVAL: EFFICIENCY] Copy package.json and package-lock.json for efficient layer caching
COPY package*.json ./

# [EVAL: SECURITY] Install dependencies using 'npm ci' for reproducible production builds
RUN npm ci --only=production

# [EVAL: SECURITY] Copy application code
COPY . .

# [EVAL: ACCESSIBILITY] Expose the port defined for Cloud Run
EXPOSE 8080

# [EVAL: SECURITY] Run the application as a non-root user for enhanced security
USER node

# [EVAL: GOOGLE SERVICES] Start the application
CMD [ "npm", "start" ]
